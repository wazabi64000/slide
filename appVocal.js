import "dotenv/config";
import express from "express";
import axios from "axios";
import PptxGenJS from "pptxgenjs";
import bodyParser from "body-parser";
import fs from "fs";

const app = express();
const PORT = 5000;
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const UNSPLASH_API_URL = "https://api.unsplash.com/search/photos";
const API_KEY = process.env.MISTRAL_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

if (!API_KEY || !UNSPLASH_ACCESS_KEY) {
    console.error("⚠️ Clé API MISTRAL ou UNSPLASH manquante ! Ajoutez-les dans le fichier .env");
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

// 🔹 Fonction pour récupérer une image via l'API Unsplash avec une recherche plus précise
const getImageFromUnsplash = async (searchQuery) => {
    try {
        const response = await axios.get(UNSPLASH_API_URL, {
            headers: {
                Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
            },
            params: {
                query: searchQuery,
                orientation: 'landscape',
                per_page: 5,  // Cherche 5 images au lieu de 1
            },
        });

        if (response.data.results.length > 0) {
            // Retourne l'URL de la première image si elle existe
            return response.data.results[0].urls.regular;
        }
        return null;
    } catch (error) {
        console.error("Erreur récupération image Unsplash:", error.message);
        return null;
    }
};

// 🔹 Générer un cours détaillé avec des paragraphes complets
app.post("/generate-summary", async (req, res) => {
    try {
        const { prompt } = req.body;

        // 📌 Demande à Mistral un cours complet avec paragraphes détaillés
        const response = await axios.post(
            MISTRAL_API_URL,
            {
                model: "mistral-tiny",
                messages: [{ role: "user", content: `Génère un cours structuré de 15 parties avec un titre et un texte détaillé (minimum 200 mots) pour chaque partie sur : ${prompt}` }],
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
                const title = summaryLines[i].replace(/^\d+\.\s*/, "");
                const description = summaryLines[i + 1].split(". ")[0]; // Prend la première phrase pour plus de contexte
                const searchQuery = `${prompt} ${title} ${description}`;

                // Utilisation d'Unsplash pour obtenir l'image
                const imageUrl = await getImageFromUnsplash(searchQuery);

                slides.push({
                    title,
                    text: summaryLines[i + 1],
                    image: imageUrl,
                });
            }
        }

        console.log("📸 Images générées :", slides.map(s => s.image));

        if (slides.length === 0) {
            throw new Error("Aucun slide généré !");
        }

        res.render("result", { slides, prompt });
    } catch (error) {
        console.error("❌ Erreur Mistral/Unsplash :", error.response ? error.response.data : error.message);
        res.status(500).send("Erreur lors de la génération du cours.");
    }
});

// 🔹 Générer le PPTX stylisé avec cours complet
app.post("/generate-ppt", async (req, res) => {
    try {
        const { titles, texts, images } = req.body;

        console.log("📂 Données reçues pour PPT :", { titles, texts, images });

        if (!titles || titles.length === 0) {
            throw new Error("Aucun titre reçu !");
        }

        const pptx = new PptxGenJS();
        titles.forEach((title, index) => {
            // Limiter la longueur du titre à 30 caractères
            const truncatedTitle = title.length > 30 ? title.substring(0, 30) + "..." : title;
        
            // S'assurer que le texte a au moins 300 caractères
            let slideText = texts[index];
            if (slideText.length <= 200) {
                slideText += " ".repeat(300 - slideText.length); 
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
        
            // Définir les tailles de texte
            const titleFontSize = 18;  // Titre en taille 18
            const textFontSize = 10;   // Paragraphe en taille 10
        
            // Appliquer un fond avec un dégradé bleu-blanc
            slide.background = {
                type: "gradient",
                x1: 0,
                y1: 0,
                x2: 1,
                y2: 1,
                stops: [
                    { color: "blue", position: 0 }, // Bleu
                    { color: "white", position: 1 }  // Blanc
                ]
            };
        
            // Ajouter le titre avec la taille et la couleur spécifiées
            slide.addText(truncatedTitle, {
                x: titleX,
                y: titleY,
                fontSize: titleFontSize,
                bold: true,
                color: "#003366",
                align: "center"
            });
        
            // Ajouter le texte du paragraphe avec une bordure et la taille spécifiée
            slide.addText(slideText, {
                x: textX,
                y: textY,
                fontSize: textFontSize,
                w: 9,        // Largeur du texte
                h: 5,        // Hauteur du texte
                align: "justify",
                color: "#333333",
                border: { type: "solid", color: "#003366", width: 1 }  // Bordure bleue
            });
        
            // Ajouter l'image à gauche ou à droite de manière alternée
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
