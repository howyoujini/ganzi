import { Spirit } from "./3d/Spirit";

const container = document.getElementById("container")!;

const spirit = new Spirit(container);

// Cleanup on page unload
window.addEventListener("beforeunload", () => {
  spirit.destroy();
});

console.log("%c The Spirit ", "background: #000; color: #ff8866; font-size: 20px; padding: 10px;");
console.log("WebGL Particle Experiment");
console.log("Move mouse to interact | Use GUI to adjust parameters");
