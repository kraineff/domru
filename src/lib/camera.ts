import { AxiosError } from "axios";
import { API } from "./api";

class Camera {
    private _api: API;
    private _id: number;

    constructor(api: API, id: number) {
        this._api = api;
        this._id = id;
    }

    get api() {
        return this._api;
    }

    get id() {
        return this._id;
    }

    async getData() {
        return await this._api.getForpostCameras().then(cameras => {
            const camera = cameras.find(c => c.ID === this._id);
            if (!camera) throw new Error("Камера не существует");
            return camera;
        });
    }

    async getSnapshot() {
        const url = `https://api-mh.ertelecom.ru/rest/v1/forpost/cameras/${this._id}/snapshots`;

        return await this._api.instance.get(url, { responseType: "stream" })
            .then(res => res.data);
    }

    async getStreamUrl(): Promise<string> {
        const url = `https://api-mh.ertelecom.ru/rest/v1/forpost/cameras/${this._id}/video`;

        return await this._api.instance.get(url)
            .then(res => {
                const { data } = res.data;
                if ("Error" in data && data.Error) throw new Error(data.Error);
                return data.URL;
            })
            .catch((err: AxiosError) => {
                const code = err.response?.status;
                if (code === 500) throw new Error("Камера не существует");
                throw err;
            });
    }
}

export { Camera };