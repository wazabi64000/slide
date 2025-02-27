require("dotenv").config();
const express = require("express");
const axios = require("axios");
const PptxGenJS = require("pptxgenjs");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const API_KEY = process.env.MISTRAL_API_KEY;

// Middleware
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// Page d'accueil
app.get("/", (req, res) => {
    res.render("index");
});

// Générer un sommaire avec Mistral
app.post("/generate-summary", async (req, res) => {
    try {
        const { prompt } = req.body;

        const response = await axios.post(
            MISTRAL_API_URL,
            {
                model: "mistral-tiny",
                messages: [{ role: "user", content: `Génère un sommaire de 5 parties sur : ${prompt}` }],
            },
            { headers: { Authorization: `Bearer ${API_KEY}` } }
        );

        const summary = response.data.choices[0].message.content.split("\n");

        res.render("result", { summary, prompt });
    } catch (error) {
        console.error("Erreur Mistral:", error.response ? error.response.data : error.message);
        res.status(500).send("Erreur lors de la génération du sommaire.");
    }
});

// Générer le PPTX
app.post("/generate-ppt", async (req, res) => {
    try {
        const { titles } = req.body;
        let pptx = new PptxGenJS();

        titles.forEach((title, index) => {
            let slide = pptx.addSlide();
            slide.addText(title, { x: 1, y: 1, fontSize: 24, bold: true, color: "003366" });
        });

        const filePath = `uploads/presentation-${Date.now()}.pptx`;
        await pptx.writeFile({ fileName: filePath });

        res.download(filePath, () => {
            fs.unlinkSync(filePath); // Supprime après téléchargement
        });
    } catch (error) {
        console.error("Erreur lors de la génération du PPT:", error);
        res.status(500).send("Erreur lors de la génération du PPT.");
    }
});

// Démarrer le serveur
app.listen(5000, () => console.log("Serveur démarré sur http://localhost:5000"));
