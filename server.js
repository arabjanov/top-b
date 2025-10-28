import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

const CACHE_FILE = "./cache.json";

// 🔄 Cache faylni o‘qish
function loadCache() {
    try {
        const data = fs.readFileSync(CACHE_FILE, "utf-8");
        return JSON.parse(data || "{}");
    } catch {
        return {};
    }
}

// 💾 Cache’ni saqlash
function saveCache(cache) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
}

app.get("/sorov", (req, res) => {
    res.status(200).send("ok"); // status + javob matni
});

app.post("/api/gemini", async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ text: "Prompt yuborilmadi." });

        const cache = loadCache();

        // Cache'da bor bo'lsa => qaytarish
        if (cache[prompt]) {
            console.log("🟢 Cache'dan javob qaytarildi");
            return res.json({ text: cache[prompt].text });
        }

        // Gemini'dan so'rov yuborish
        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
            }),
        });

        if (!response.ok) {
            throw new Error(`Gemini API xatosi: ${response.status}`);
        }

        const data = await response.json();
        const text =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "Hech narsa qaytmadi.";

        // Cache'ga yozish
        cache[prompt] = { text, lastTime: Date.now() };
        saveCache(cache);

        console.log("🟡 Yangi so'rov saqlandi:", prompt);
        res.json({ text });

    } catch (err) {
        console.error("Gemini xatosi:", err);
        res.status(500).json({
            text: "Xatolik yuz berdi yoki Gemini API ishlamayapti.",
            error: err.message
        });
    }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () =>
    console.log(`✅ Gemini backend http://localhost:${PORT} da ishlayapti`)
);
