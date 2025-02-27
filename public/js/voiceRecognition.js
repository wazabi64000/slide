let recognition;
let isRecording = false;

// Vérifie si le navigateur prend en charge la reconnaissance vocale
function checkVoiceSupport() {
    if (!('webkitSpeechRecognition' in window)) {
        alert("Votre navigateur ne supporte pas la reconnaissance vocale.");
        return false;
    }
    return true;
}

// Active la reconnaissance vocale
function startRecognition() {
    if (!checkVoiceSupport()) return;

    // Vérifie que le microphone est activé
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
            console.log("Microphone activé.");

            // Initialisation de la reconnaissance vocale
            recognition = new webkitSpeechRecognition();
            recognition.continuous = true; // Permet de capter de manière continue la voix
            recognition.lang = "fr-FR";    // Langue française
            recognition.interimResults = true;  // Donne les résultats intermédiaires (pendant l'enregistrement)
            recognition.maxAlternatives = 1;  // Nombre de résultats à considérer

            // Lorsque de la parole est captée
            recognition.onresult = (event) => {
                const transcript = event.results[event.resultIndex][0].transcript;
                document.getElementById('voiceInput').value = transcript;  // Afficher le texte capté dans l'input
            };

            // Si une erreur se produit
            recognition.onerror = (event) => {
                console.error("Erreur de reconnaissance vocale :", event.error);
            };

            // Démarrer la reconnaissance
            recognition.start();
            isRecording = true;
            document.getElementById('startBtn').disabled = true; // Désactive le bouton "Commencer"
            document.getElementById('stopBtn').disabled = false; // Active le bouton "Arrêter"
            document.getElementById('voiceCommands').classList.remove('hidden'); // Affiche les commandes vocales
        })
        .catch((err) => {
            alert("Le microphone n'est pas disponible ou l'accès est refusé.");
        });
}

// Arrête la reconnaissance vocale
function stopRecognition() {
    if (recognition) {
        recognition.stop();
        isRecording = false;
        document.getElementById('startBtn').disabled = false; // Active le bouton "Commencer"
        document.getElementById('stopBtn').disabled = true; // Désactive le bouton "Arrêter"
    }
}

// Ajouter un saut de ligne dans le texte
function addNewLine() {
    const textInput = document.getElementById('voiceInput');
    textInput.value += '\n';  // Ajouter un saut de ligne
}

// Événements des boutons
document.getElementById('startBtn').addEventListener('click', startRecognition);
document.getElementById('stopBtn').addEventListener('click', stopRecognition);
document.getElementById('newLineBtn').addEventListener('click', addNewLine);
