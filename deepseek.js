import "dotenv/config";
import express from "express";
import axios from "axios";
import PptxGenJS from "pptxgenjs";
import bodyParser from "body-parser";
import fs from "fs";

const app = express();
const PORT = 5000;
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"; // Vérifie l'URL exacte de l'API DeepSeek
const PEXELS_API_URL = "https://api.pexels.com/v1/search";
const API_KEY = process.env.DEEPSEEK_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

if (!API_KEY || !PEXELS_API_KEY) {
    console.error("⚠️ Clé API DeepSeek ou Pexels manquante ! Ajoutez-les dans le fichier .env");
    process.exit(1);
}

// Middleware
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// 📌 Page d'accueil
app.get("/", (req, res) => {
    res.render("index");
});

// 🔹 Générer un cours détaillé
app.post("/generate-summary", async (req, res) => {
    try {
        const { prompt } = req.body;

        // 🔍 Demande à DeepSeek un cours structuré
        const response = await axios.post(
            DEEPSEEK_API_URL,
            {
                model: "deepseek-chat", // Vérifie le modèle exact
                messages: [{ role: "user", content: `Génère un cours structuré en 15 parties avec un titre et un texte détaillé (minimum 200 mots) pour chaque partie sur : ${prompt}` }],
            },
            { headers: { Authorization: `Bearer ${API_KEY}` } }
        );

        if (!response.data.choices || response.data.choices.length === 0) {
            throw new Error("DeepSeek n'a pas renvoyé de contenu valide !");
        }

        const summaryText = response.data.choices[0].message.content;
        const summaryLines = summaryText.split("\n").filter(line => line.trim() !== "");

        let slides = [];
        for (let i = 0; i < summaryLines.length; i += 2) {
            if (summaryLines[i] && summaryLines[i + 1]) {
                const title = summaryLines[i].replace(/^\d+\.\s*/, "");
                const description = summaryLines[i + 1].split(". ")[0]; // Première phrase pour plus de contexte
                const searchQuery = `${prompt} ${title} ${description}`;

                // 🔍 Récupération d'une image via Pexels
                const imageResponse = await axios.get(`${PEXELS_API_URL}?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=landscape`, {
                    headers: { Authorization: PEXELS_API_KEY }
                });

                const imageUrl = imageResponse.data.photos.length > 0 ? imageResponse.data.photos[0].src.medium : "";

                slides.push({
                    title,
                    text: summaryLines[i + 1],
                    image: imageUrl
                });
            }
        }

        if (slides.length === 0) {
            throw new Error("Aucun slide généré !");
        }

        res.render("result", { slides, prompt });
    } catch (error) {
        console.error("❌ Erreur DeepSeek/Pexels :", error.response ? error.response.data : error.message);
        res.status(500).send("Erreur lors de la génération du cours.");
    }
});

// 🔹 Générer un PPT stylisé avec les cours
app.post("/generate-ppt", async (req, res) => {
    try {
        const { titles, texts, images } = req.body;

        if (!titles || titles.length === 0) {
            throw new Error("Aucun titre reçu !");
        }

        const pptx = new PptxGenJS();
        titles.forEach((title, index) => {
            const truncatedTitle = title.length > 30 ? title.substring(0, 30) + "..." : title;

            let slideText = texts[index];
            if (slideText.length <= 100) {
                slideText += " ".repeat(300 - slideText.length) + " (Texte complété pour atteindre 300 caractères minimum.)";
            }

            let slide = pptx.addSlide();

            // Alternance de la position de l'image (gauche/droite)
            const isEvenSlide = index % 2 === 0;
            const imageX = isEvenSlide ? "20%" : 0;
            const imageY = "5%";
            const titleX = 5;
            const titleY = 0;
            const textX = isEvenSlide ? 0.5 : "50%";
            const textY = 1.5;

            // 🎨 Appliquer un fond avec un dégradé bleu-blanc
            slide.background = {
                type: "gradient",
                x1: 0,
                y1: 0,
                x2: 1,
                y2: 1,
                stops: [
                    { color: "blue", position: 0 },
                    { color: "white", position: 1 }
                ]
            };

            // ✏️ Ajouter le titre
            slide.addText(truncatedTitle, {
                x: titleX,
                y: titleY,
                fontSize: 18,
                bold: true,
                color: "#003366",
                align: "center"
            });

            // 📝 Ajouter le texte avec bordure
            slide.addText(slideText, {
                x: textX,
                y: textY,
                fontSize: 10,
                w: 9,
                h: 5,
                align: "justify",
                color: "#333333",
                border: { type: "solid", color: "#003366", width: 1 }
            });

            // 🖼️ Ajouter l'image si dispo
            if (images[index]) {
                slide.addImage({
                    path: images[index],
                    x: imageX,
                    y: imageY,
                    w: 2,
                    h: 2,
                    rounding: true
                });
            }
        });

        const filePath = "./public/presentation.pptx";
        pptx.writeFile({ fileName: filePath }).then(() => {
            res.download(filePath, "presentation.pptx", (err) => {
                if (err) console.error("❌ Erreur téléchargement PPTX :", err);
                fs.unlinkSync(filePath);
            });
        });

    } catch (error) {
        console.error("❌ Erreur génération PPT :", error.message);
        res.status(500).send("Erreur lors de la génération du PPT.");
    }
});

// 🚀 Démarrer le serveur
app.listen(PORT, () => console.log(`✅ Serveur démarré sur http://localhost:${PORT}`));
