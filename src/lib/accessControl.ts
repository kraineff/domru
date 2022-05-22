import { AxiosError } from "axios";
import { API } from "./api";
import { Camera } from "./camera";

class AccessControl {
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
        return await this._api.getPlaces().then(places => {
            const accessControl = places
                .map(place => {
                    const ac = place.accessControls.find(ac => ac.id === this._id);
                    return ac ? { ...ac, placeId: place.id } : undefined;
                })
                .find(item => item !== undefined);

            if (!accessControl) throw new Error("Устройство доступа не существует");
            return accessControl;
        })
    }

    async getCamera() {
        const { forpostGroupId } = await this.getData();

        return await this._api.getForpostCameras().then(cameras => {
            const camera = cameras
                .map(camera => camera.ParentGroups.find(group => group.ID === Number(forpostGroupId)) && camera)
                .find(item => item !== undefined);
            
            if (!camera) throw new Error("Камера не существует");
            return new Camera(this._api, camera.ID);
        });
    }

    async open() {
        const ac = await this.getData();
        const url = `https://api-mh.ertelecom.ru/rest/v1/places/${ac.placeId}/accesscontrols/${this._id}/actions`;
        const data = {
            name: "accessControlOpen"
        };

        return await this._api.instance.post(url, data)
            .then(() => Promise.resolve())
            .catch((err: AxiosError) => {
                const code = err.response?.status;
                if (code === 500) throw new Error("Устройство доступа не существует");
                throw err;
            });
    }
}

export { AccessControl };