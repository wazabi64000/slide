import "dotenv/config";
import express from "express";
import axios from "axios";
import PptxGenJS from "pptxgenjs";
import bodyParser from "body-parser";
import fs from "fs";

const app = express();
const PORT = 5000;
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const IMAGE_API_URL = "https://source.unsplash.com/800x600/?technology,education";
const API_KEY = process.env.MISTRAL_API_KEY;

if (!API_KEY) {
    console.error("⚠️ Clé API MISTRAL manquante ! Ajoutez-la dans le fichier .env");
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

// 🔹 Générer un sommaire avec Mistral AI + textes explicatifs
app.post("/generate-summary", async (req, res) => {
    try {
        const { prompt } = req.body;

        // 📌 Demande à Mistral un sommaire détaillé
        const response = await axios.post(
            MISTRAL_API_URL,
            {
                model: "mistral-tiny",
                messages: [{ role: "user", content: `Génère un sommaire de 15 parties avec un titre et un explicatif pour chaque partie sur : ${prompt}` }],
            },
            { headers: { Authorization: `Bearer ${API_KEY}` } }
        );

        console.log("🔍 Réponse brute de Mistral :", response.data);

        if (!response.data.choices || response.data.choices.length === 0) {
            throw new Error("Mistral n'a pas renvoyé de contenu valide !");
        }

        const summaryText = response.data.choices[0].message.content;
        const summaryLines = summaryText.split("\n").filter(line => line.trim() !== "");

        let slides = [];
        for (let i = 0; i < summaryLines.length; i += 2) {
            if (summaryLines[i] && summaryLines[i + 1]) {
                slides.push({
                    title: summaryLines[i].replace(/^\d+\.\s*/, ""),
                    text: summaryLines[i + 1],
                    image: `${IMAGE_API_URL}&sig=${i}`
                });
            }
        }

        console.log("📸 Images générées :", slides.map(s => s.image));

        if (slides.length === 0) {
            throw new Error("Aucun slide généré !");
        }

        res.render("result", { slides, prompt });
    } catch (error) {
        console.error("❌ Erreur Mistral :", error.response ? error.response.data : error.message);
        res.status(500).send("Erreur lors de la génération du sommaire.");
    }
});

// 🔹 Générer le PPTX avec titre, texte et image
app.post("/generate-ppt", async (req, res) => {
    try {
        const { titles, texts, images } = req.body;

        console.log("📂 Données reçues pour PPT :", { titles, texts, images });

        if (!titles || titles.length === 0) {
            throw new Error("Aucun titre reçu !");
        }

        const pptx = new PptxGenJS();

        titles.forEach((title, index) => {
            let slide = pptx.addSlide();
            slide.addText(title, { x: 1, y: 0.5, fontSize: 24 });
            slide.addText(texts[index], { x: 1, y: 1.5, fontSize: 18 });

            if (images[index]) {
                slide.addImage({ path: images[index], x: O, y: 3, w: 12, h: 5 });
            }
        });

        const filePath = "./public/presentation.pptx";
        pptx.writeFile({ fileName: filePath }).then(() => {
            res.download(filePath, "presentation.pptx", (err) => {
                if (err) console.error("❌ Erreur téléchargement PPTX :", err);
                fs.unlinkSync(filePath); // Supprimer le fichier après téléchargement
            });
        });

    } catch (error) {
        console.error("❌ Erreur génération PPT :", error.message);
        res.status(500).send("Erreur lors de la génération du PPT.");
    }
});

// 🚀 Démarrer le serveur
app.listen(PORT, () => console.log(`✅ Serveur démarré sur http://localhost:${PORT}`));
