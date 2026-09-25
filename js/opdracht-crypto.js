window.opdrachtCrypto = (() => {
  const iterations = 600000;
  const sessionName = 'tn-opdrachten-toegang';
  const bytes = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
  const base64 = data => {
    let text = '';
    for (const byte of new Uint8Array(data)) text += String.fromCharCode(byte);
    return btoa(text);
  };
  function valideer(payload) {
    if (payload.version !== 1 || payload.algorithm !== 'AES-GCM' ||
        payload.iterations !== iterations || bytes(payload.salt).length !== 16 ||
        bytes(payload.iv).length !== 12) throw new Error('Onbekend bestandsformaat');
  }
  async function sleutel(password, salt) {
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: bytes(salt), iterations, hash: 'SHA-256' },
      material, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  }
  async function ontsleutel(payload, key) {
    valideer(payload);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes(payload.iv) }, key, bytes(payload.ciphertext));
    const data = JSON.parse(new TextDecoder().decode(plain));
    if (!Array.isArray(data)) throw new Error('Geen opdrachtenlijst');
    return data;
  }
  async function versleutel(data, password) {
    if (!Array.isArray(data)) throw new Error('Gebruik een JSON-lijst met opdrachten');
    const salt = base64(crypto.getRandomValues(new Uint8Array(16)));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await sleutel(password, salt);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key,
      new TextEncoder().encode(JSON.stringify(data)));
    return { version: 1, algorithm: 'AES-GCM', iterations, salt, iv: base64(iv), ciphertext: base64(ciphertext) };
  }
  async function laadBestand() {
    const response = await fetch('data/opdrachten.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Opdrachten konden niet worden geladen');
    const payload = await response.json();
    valideer(payload);
    if (payload.accessFile) {
      const response = await fetch('data/toegang.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('Toegangsbestand kon niet worden geladen');
      const access = await response.json();
      if (access.version !== 1 || access.salt !== payload.salt || !access.master ||
          !['derived', 'wrapped'].includes(access.guest?.mode)) throw new Error('Ongeldig toegangsbestand');
      valideer(access.master);
      if (access.guest.mode === 'wrapped') valideer(access.guest.envelope);
      Object.defineProperty(payload, 'access', { value: access });
    }
    return payload;
  }
  async function openGast(payload, password) {
    let key;
    if (payload.access?.guest.mode === 'wrapped') {
      const envelope = payload.access.guest.envelope;
      const wrappingKey = await sleutel(password, envelope.salt);
      const [entry] = await ontsleutel(envelope, wrappingKey);
      if (entry.salt !== payload.salt) throw new Error('Bestanden komen niet overeen');
      key = await crypto.subtle.importKey('raw', bytes(entry.key), 'AES-GCM', true, ['encrypt', 'decrypt']);
    } else key = await sleutel(password, payload.salt);
    await ontsleutel(payload, key);
    return key;
  }
  async function voegMasterToe(payload, readKey, password) {
    const raw = base64(await crypto.subtle.exportKey('raw', readKey));
    return { ...payload, master: await versleutel([{ key: raw, salt: payload.salt }], password) };
  }
  async function openBeheer(payload, password) {
    const master = payload.access?.master || payload.master;
    if (!master) throw new Error('Geen mastersleutel ingesteld');
    valideer(master);
    const masterKey = await sleutel(password, master.salt);
    const [access] = await ontsleutel(master, masterKey);
    if (access.salt !== payload.salt) throw new Error('Bestanden komen niet overeen');
    const readKey = await crypto.subtle.importKey('raw', bytes(access.key), 'AES-GCM', true, ['encrypt', 'decrypt']);
    const data = await ontsleutel(payload, readKey);
    return { data, readKey, masterKey, payload };
  }
  async function encryptMetSleutel(data, key, salt) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key,
      new TextEncoder().encode(JSON.stringify(data)));
    return { version: 1, algorithm: 'AES-GCM', iterations, salt, iv: base64(iv), ciphertext: base64(ciphertext) };
  }
  async function bewaarBeheer(data, toegang, newReadPassword = '', newMasterPassword = '') {
    if (toegang.payload.accessFile) {
      if (newReadPassword || newMasterPassword) throw new Error('Gebruik afzonderlijk wachtwoordbeheer');
      return { ...await encryptMetSleutel(data, toegang.readKey, toegang.payload.salt), accessFile: true };
    }
    let payload, readKey;
    if (newReadPassword) {
      payload = await versleutel(data, newReadPassword);
      readKey = await sleutel(newReadPassword, payload.salt);
    } else {
      readKey = toegang.readKey;
      payload = await encryptMetSleutel(data, readKey, toegang.payload.salt);
    }
    const raw = base64(await crypto.subtle.exportKey('raw', readKey));
    payload.master = newMasterPassword
      ? await versleutel([{ key: raw, salt: payload.salt }], newMasterPassword)
      : await encryptMetSleutel([{ key: raw, salt: payload.salt }], toegang.masterKey, toegang.payload.master.salt);
    return payload;
  }
  async function bewaarWachtwoorden(toegang, guestPassword, masterPassword) {
    const current = toegang.payload.access;
    if (!current) throw new Error('Publiceer eerst de gescheiden toegangsbestanden.');
    const raw = base64(await crypto.subtle.exportKey('raw', toegang.readKey));
    const entry = [{ key: raw, salt: toegang.payload.salt }];
    return {
      ...current,
      revision: base64(crypto.getRandomValues(new Uint8Array(16))),
      guest: guestPassword ? { mode: 'wrapped', envelope: await versleutel(entry, guestPassword) } : current.guest,
      master: masterPassword ? await versleutel(entry, masterPassword) : current.master
    };
  }
  async function onthoud(key, payload) {
    const raw = await crypto.subtle.exportKey('raw', key);
    sessionStorage.setItem(sessionName, JSON.stringify({ salt: payload.salt, revision: payload.access?.revision, key: base64(raw) }));
  }
  async function laadMetToegang() {
    const payload = await laadBestand();
    const saved = JSON.parse(sessionStorage.getItem(sessionName) || 'null');
    if (!saved || saved.salt !== payload.salt || saved.revision !== payload.access?.revision) throw new Error('Opnieuw inloggen nodig');
    const key = await crypto.subtle.importKey('raw', bytes(saved.key), 'AES-GCM', false, ['decrypt']);
    return ontsleutel(payload, key);
  }
  function uitloggen() { sessionStorage.removeItem(sessionName); }
  return { sleutel, ontsleutel, versleutel, laadBestand, onthoud, laadMetToegang, uitloggen,
    voegMasterToe, openGast, openBeheer, bewaarBeheer, bewaarWachtwoorden };
})();
