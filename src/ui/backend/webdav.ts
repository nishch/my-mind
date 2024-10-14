import BackendUI, { Mode, buildList } from "./backend.js";
import WebDAV from "../../backend/webdav.js";
import * as app from "../../my-mind.js";
import { repo as formatRepo } from "../../format/format.js";

interface State {
  b: string;
  id: string;
}

export default class WebDAVUI extends BackendUI<WebDAV> {
  protected current = "";

  constructor() {
    super(new WebDAV(), "Generic WebDAV");

    this.remove.addEventListener("click", async (_) => {
      var id = this.list.value;
      if (!id) {
        return;
      }
      await this.backend.remove(id);
      this.show(this.mode);
    });
  }

  setState(data: State) {
    this.load(data.id);
  }

  getState() {
    let data: State = {
      b: this.id,
      id: app.currentMap.id
    };
    return data;
  }

  protected get list() {
    return this.node.querySelector<HTMLSelectElement>(".list")!;
  }
  protected get remove() {
    return this.node.querySelector<HTMLButtonElement>(".remove")!;
  }

  async show(mode: Mode) {
    super.show(mode);

    const { go, remove, list } = this;

    go.disabled = false;

    if (mode == "load") {
      let stored = await this.backend.list();
      list.innerHTML = "";
      if (Object.keys(stored).length) {
        go.disabled = false;
        remove.disabled = false;
        buildList(stored, this.list);
      } else {
        this.go.disabled = true;
        this.remove.disabled = true;
        let o = document.createElement("option");
        o.innerHTML = "(no maps saved)";
        this.list.append(o);
      }
    }
  }

  async save() {
    app.setThrobber(true);
    var map = app.currentMap;
    let json = map.toJSON();
    let data = formatRepo.get("native")!.to(json);

    try {
      await this.backend.save(data, map.name, map.id);
      this.saveDone();
    } catch (e) {
      this.error(e);
    }
  }

  async load(id = this.list.value) {
    app.setThrobber(true);

    try {
      let data = await this.backend.load(id);
      var json = formatRepo.get("native")!.from(data);
      this.loadDone(json);
    } catch (e) {
      this.error(e);
      app.setThrobber(false);
    }
  }
}
