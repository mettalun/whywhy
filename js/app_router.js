import { detectDevice } from "./device_detector.js";
import { createPcApp } from "./pc/pc_app.js";
import { createMobileApp } from "./mobile/mobile_app.js";

export class AppRouter {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.currentDevice = null;
    this.currentApp = null;
  }

  start() {
    this.renderForDevice(detectDevice());
  }

  renderForDevice(nextDevice) {
    if (this.currentApp && typeof this.currentApp.destroy === "function") {
      this.currentApp.destroy();
    }

    this.rootElement.innerHTML = "";
    document.body.dataset.device = nextDevice;
    this.currentDevice = nextDevice;
    this.currentApp =
      nextDevice === "pc"
        ? createPcApp(this.rootElement)
        : createMobileApp(this.rootElement);
  }
}
