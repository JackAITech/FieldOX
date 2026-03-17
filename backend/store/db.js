const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function read(name) {
  try {
    return JSON.parse(fs.readFileSync(filePath(name), "utf8"));
  } catch {
    return [];
  }
}

function write(name, data) {
  fs.writeFileSync(filePath(name), JSON.stringify(data, null, 2));
}

function getAll(name) {
  return read(name);
}

function insert(name, record) {
  const data = read(name);
  const newRecord = { id: Date.now().toString(), createdAt: new Date().toISOString(), ...record };
  data.unshift(newRecord); // newest first
  write(name, data);
  return newRecord;
}

function update(name, id, changes) {
  const data = read(name);
  const idx = data.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  data[idx] = { ...data[idx], ...changes, updatedAt: new Date().toISOString() };
  write(name, data);
  return data[idx];
}

function remove(name, id) {
  const data = read(name);
  const filtered = data.filter((r) => r.id !== id);
  if (filtered.length === data.length) return false;
  write(name, filtered);
  return true;
}

module.exports = { getAll, insert, update, remove };
