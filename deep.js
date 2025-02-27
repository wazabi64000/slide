import "dotenv/config";
import express from "express";
import axios from "axios";
import PptxGenJS from "pptxgenjs";
import bodyParser from "body-parser";
import fs from "fs";

const app = express();
const PORT = 5000;

// API URLs
const DEEPAI_API_URL = "https://deep-image.ai/rest_api/process_result";
const DEEPAI_API_KEY = process.env.DEEPAI_API_KEY; // Votre clé API Deep Image

if (!DEEPAI_API_KEY) {
    console.error("⚠️ Clé API Deep Image manquante ! Ajoutez-la dans le fichier .env");
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

// Fonction pour récupérer et améliorer l'image avec Deep Image
const getImageFromDeepImage = async (imageUrl) => {
    try {
        const response = await axios.post(
            DEEPAI_API_URL,
            {
                enhancements: ["denoise", "deblur", "light"], // Améliorations à appliquer
                url: imageUrl, // URL de l'image à traiter
                width: 2000, // Largeur de l'image traitée
            },
            {
                headers: { "x-api-key": DEEPAI_API_KEY },
            }
        );

        if (response.data.status === 'complete') {
            const resultUrl = response.data.result_url;
            console.log("Image traitée disponible ici : ", resultUrl);
            return resultUrl;  // URL de l'image traitée
        } else {
            console.log("Échec du traitement de l'image.");
            return null;
        }
    } catch (error) {
        console.error("Erreur avec l'API Deep Image : ", error.message);
        return null;
    }
};

// 🔹 Générer le PPTX stylisé avec images traitées
app.post("/generate-ppt", async (req, res) => {
    try {
        const { titles, texts, images } = req.body;

        console.log("📂 Données reçues pour PPT :", { titles, texts, images });

        if (!titles || titles.length === 0) {
            throw new Error("Aucun titre reçu !");
        }

        const pptx = new PptxGenJS();
        for (let i = 0; i < titles.length; i++) {
            // Limiter la longueur du titre à 30 caractères
            const truncatedTitle = titles[i].length > 30 ? titles[i].substring(0, 30) + "..." : titles[i];

            // S'assurer que le texte a au moins 300 caractères
            let slideText = texts[i];
            if (slideText.length <= 200) {
                slideText += " ".repeat(300 - slideText.length);
            }

            let slide = pptx.addSlide();

            // Alternance de la position de l'image (gauche/droite)
            const isEvenSlide = i % 2 === 0;
            const imageX = isEvenSlide ? "20%" : 0;
            const imageY = "5%";
            const titleX = 5;
            const titleY = 0;
            const textX = isEvenSlide ? 0.5 : "50%";
            const textY = 1.5;

            // Définir les tailles de texte
            const titleFontSize = 18;
            const textFontSize = 10;

            // Appliquer un fond avec un dégradé bleu-blanc
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
                w: 9,
                h: 5,
                align: "justify",
                color: "#333333",
                border: { type: "solid", color: "#003366", width: 1 }
            });

            // Pour chaque image, on la traite avec Deep Image et on l'ajoute à la slide
            const imageUrl = images[i];
            const improvedImageUrl = await getImageFromDeepImage(imageUrl);

            if (improvedImageUrl) {
                slide.addImage({
                    path: improvedImageUrl,
                    x: imageX,
                    y: imageY,
                    w: 2,
                    h: 2,
                    rounding: true
                });
            }
        }

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


// 📌 Générer un résumé avec Mistral
app.post("/generate-summary", async (req, res) => {
  try {
      const { prompt } = req.body;  // Récupère le "prompt" envoyé dans la requête

      // Exemple de réponse avec Mistral (ici, il est seulement simulé pour l'exemple)
      const summaryText = `Résumé simulé du sujet : ${prompt}`;
      const summaryLines = summaryText.split("\n").filter(line => line.trim() !== "");

      let slides = [];
      for (let i = 0; i < summaryLines.length; i += 2) {
          if (summaryLines[i] && summaryLines[i + 1]) {
              const title = summaryLines[i];
              const description = summaryLines[i + 1];

              slides.push({
                  title,
                  text: description,
              });
          }
      }

      // Si tout va bien, renvoyer un résultat avec les slides générés
      res.render("result", { slides, prompt });

  } catch (error) {
      console.error("❌ Erreur génération résumé :", error.message);
      res.status(500).send("Erreur lors de la génération du résumé.");
  }
});


// 🚀 Démarrer le serveur
app.listen(PORT, () => console.log(`✅ Serveur démarré sur http://localhost:${PORT}`));
