import Backend from "./backend.js";
import { repo as formatRepo } from "../format/format.js";

declare const google: any;
declare const gapi: any;

// const FOLDER_ID = "1nDezb6ycCqDfYydS6hdrHnfkkGOgRxPa";
const DISCOVERY_DOC =
  "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest";
const SCOPES =
  "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/docs";
const CLIENT_ID =
  "245823865902-v6m24s7d3jsi89hoq6jn3249hnef73nf.apps.googleusercontent.com";
const API_KEY = "AIzaSyCfVaJ0wA2DDfDHLzs7MwuqiiXH385LXHQ";

let tokenClient: any, tokenExpiresAt: Date;

export interface LoadedData {
  name: string;
  data: string;
  mime: string;
}

export default class GDrive extends Backend {
  fileId: string | null = null;

  constructor() {
    super("gdrive");
  }

  reset() {
    this.fileId = null;
  }

  async save(data: string, name: string, mime: string) {
    await connect();
    this.fileId = await this.send(data, name, mime);
  }

  protected send(data: string, name: string, mime: string) {
    var path = "/upload/drive/v2/files";
    var method = "POST";
    if (this.fileId) {
      path += "/" + this.fileId;
      method = "PUT";
    }

    var boundary = "b" + Math.random();
    var delimiter = "--" + boundary;
    var body = [
      delimiter,
      "Content-Type: application/json",
      "",
      JSON.stringify({ title: name }),
      delimiter,
      "Content-Type: " + mime,
      "",
      data,
      delimiter + "--"
    ].join("\r\n");

    var request = gapi.client.request({
      path: path,
      method: method,
      headers: {
        "Content-Type": "multipart/mixed; boundary='" + boundary + "'"
      },
      body: body
    });

    return new Promise<string>((resolve, reject) => {
      request.execute((response: any) => {
        if (!response) {
          reject(new Error("Failed to upload to Google Drive"));
        } else if (response.error) {
          reject(response.error);
        } else {
          resolve(response.id);
        }
      });
    });
  }

  async load(id: string) {
    await connect();
    this.fileId = id;

    const [fileMeta, file] = await Promise.all([
      gapi.client.drive.files.get({ fileId: this.fileId }),
      gapi.client.drive.files.get({ fileId: this.fileId, alt: "media" })
    ]);

    return {
      data: file.body,
      name: fileMeta.result.name,
      mime: fileMeta.result.mimeType
    };
  }

  async pick() {
    await connect();

    var token = gapi.auth.getToken();
    var mimeTypes = ["application/json; charset=UTF-8", "application/json"];
    [...formatRepo.values()].forEach((format) => {
      if (format.mime) {
        mimeTypes.unshift(format.mime);
      }
    });

    var view = new google.picker.DocsView(google.picker.ViewId.DOCS)
      .setMimeTypes(mimeTypes.join(","))
      .setMode(google.picker.DocsViewMode.LIST);

    return new Promise<string | null>((resolve) => {
      let picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .addView(view)
        .setOAuthToken(token.access_token)
        .setDeveloperKey(API_KEY)
        .setCallback((data: any) => {
          switch (data[google.picker.Response.ACTION]) {
            case google.picker.Action.PICKED:
              var doc = data[google.picker.Response.DOCUMENTS][0];
              resolve(doc.id);
              break;

            case google.picker.Action.CANCEL:
              resolve(null);
              break;
          }
        })
        .build();
      picker.setVisible(true);
    });
  }
}

async function connect() {
  await Promise.all([loadGapi(), loadGis()]);
  return new Promise<void>((resolve, reject) => {
    tokenClient.callback = (resp) => {
      if (resp.error) {
        reject(resp.error);
        return;
      }

      const now = new Date();
      now.setSeconds(now.getSeconds() + resp.expires_in - 600);
      tokenExpiresAt = now;
      resolve();
    };

    if (gapi.client.getToken() === null || new Date() > tokenExpiresAt) {
      // Prompt the user to select a Google Account and ask for consent to share their data
      // when establishing a new session.
      tokenClient.requestAccessToken({ prompt: "consent" });
    } else {
      resolve();
      // Skip display of account chooser and consent dialog for an existing session.
      // tokenClient.requestAccessToken({ prompt: "" });
    }
  });
}

async function initializeGapiClient(cb) {
  await gapi.client.init({
    apiKey: API_KEY,
    discoveryDocs: [DISCOVERY_DOC]
  });
  cb();
}

function gapiLoaded(cb) {
  gapi.load("client:picker", initializeGapiClient.bind(null, cb));
}

function gisLoaded(cb) {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: "" // defined later
  });
  cb();
}

function loadGapi() {
  return new Promise<void>((resolve) => {
    if ("gapi" in window) {
      resolve();
      return;
    }

    let script = document.createElement("script");
    script.setAttribute("src", "https://apis.google.com/js/api.js");
    script.setAttribute("async", "");
    script.onload = gapiLoaded.bind(null, resolve);

    document.body.append(script);
  });
}

function loadGis() {
  return new Promise<void>((resolve) => {
    if ("google" in window && google.accounts) {
      resolve();
      return;
    }

    let script = document.createElement("script");
    script.setAttribute("src", "https://accounts.google.com/gsi/client");
    script.setAttribute("async", "");
    script.onload = gisLoaded.bind(null, resolve);

    document.body.append(script);
  });
}
