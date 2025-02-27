// function showLoading() {
//     // Affiche le spinner
//     document.getElementById("loading-spinner").style.display = "block";

//     // Désactive le bouton pour éviter plusieurs soumissions
//     document.querySelector("button[type='submit']").disabled = true;
// }



function showLoading() {
    // Afficher le spinner et le message
    document.getElementById("loading-spinner").style.display = "block";
    let loadingText = document.getElementById("loading-text");
    loadingText.classList.remove("hidden"); // Rendre visible

    // Désactiver le bouton pour éviter plusieurs clics
    document.querySelector("button[type='submit']").disabled = true;

    // Animation du texte avec Anime.js (fade-in + pulsation)
    anime({
        targets: "#loading-text",
        opacity: [0, 1],
        duration: 1000,
        easing: "easeInOutQuad",
        loop: true,
        direction: "alternate"
    });
}
