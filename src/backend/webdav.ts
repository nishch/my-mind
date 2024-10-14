import Backend from "./backend.js";

export default class WebDAV extends Backend {
  constructor() {
    super("webdav");
  }

  async save(data: string, name: string, id: string) {
    return await this.request(
      "POST",
      `/maps/${id}`,
      JSON.stringify({
        name,
        mapData: data
      })
    );
  }

  async load(id: string) {
    const map = await this.request("GET", `/maps/${id}`);
    return map.mind_map as string;
  }

  async remove(id: string) {
    await this.request("DELETE", `/maps/${id}`);
  }

  async list() {
    const maps = await this.request("GET", "/maps");
    return maps.reduce((a, b) => {
      a[b.id] = b.name;
      return a;
    }, {});
  }

  async request(method: string, url: string, data?: string) {
    let init: RequestInit = {
      method,
      credentials: "include"
    };
    if (data) {
      init.body = data;
    }

    let response = await fetch(url, init);
    let resData = await response.json();

    if (response.ok) {
      return resData;
    } else {
      throw new Error(`HTTP/${response.status}\n\n${resData}`);
    }
  }
}
