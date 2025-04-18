const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/lofi_servers.json");

function loadLofiData() {
     try {
          if (!fs.existsSync(filePath)) return [];
          const data = fs.readFileSync(filePath, "utf8");
          return JSON.parse(data);
     } catch (error) {
          console.error("[LofiStorage] Gagal memuat file:", error);
          return [];
     }
}

function saveLofiData(data) {
     try {
          fs.writeFileSync(filePath, JSON.stringify(data, null, 4), "utf8");
     } catch (error) {
          console.error("[LofiStorage] Gagal menyimpan file:", error);
     }
}

function saveLofiSession(guildId, channelId) {
     const data = loadLofiData();
     const exists = data.find(s => s.guildId === guildId);
     if (!exists) data.push({ guildId, channelId });
     saveLofiData(data);
}

function removeLofiSession(guildId) {
     let data = loadLofiData();
     data = data.filter(s => s.guildId !== guildId);
     saveLofiData(data);
}

function getLofiSessions() {
     return loadLofiData();
}

module.exports = {
     saveLofiSession,
     removeLofiSession,
     getLofiSessions
};
