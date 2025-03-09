const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/last_messages.json");

function loadJson() {
     try {
          if (!fs.existsSync(filePath)) return {};
          const data = fs.readFileSync(filePath, "utf8");
          return JSON.parse(data);
     } catch (error) {
          console.error("[JSONStorage] Gagal memuat file JSON:", error);
          return {};
     }
}

function saveJson(data) {
     try {
          fs.writeFileSync(filePath, JSON.stringify(data, null, 4), "utf8");
     } catch (error) {
          console.error("[JSONStorage] Gagal menyimpan file JSON:", error);
     }
}

function getLastMessageId(key) {
     const data = loadJson();
     return data[key] || null;
}

function saveLastMessageId(key, messageId) {
     const data = loadJson();
     data[key] = messageId;
     saveJson(data);
}

module.exports = { getLastMessageId, saveLastMessageId };
