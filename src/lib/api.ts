import axios, { AxiosError, AxiosInstance } from "axios";
import createAuthRefreshInterceptor from "axios-auth-refresh";
import EventEmitter from "events";

import { ForpostCamerasResponse, LoginConfirmationResponse, LoginDetailsResponse, OperatorsResponse, SubscriberFinancesResponse, SubscriberPlacesResponse, SubscriberProfileResponse } from "../types/api";

type LoginDetails = {
    phone: number;
    operatorId: number;
    subscriberId: number;
    accountId: string | null;
    placeId: number;
    address: string;
    profileId: string | null;
}

class API {
    private _loginDetails!: LoginDetails;
    private _accessToken!: string;
    private _refreshToken!: string;
    private _ready: boolean;

    instance: AxiosInstance;
    emmiter: EventEmitter;

    constructor() {
        this._ready = false;
        this.instance = axios.create();
        this.emmiter = new EventEmitter();

        this.instance.interceptors.request.use(req => {
            if (!this._ready) throw new Error("Нет авторизации");
            req.headers = {
                ...req.headers,
                Authorization: `Bearer ${this._accessToken}`,
                Operator: String(this._loginDetails.operatorId)
            };
            return req;
        });

        const refresh = async (req: any) => this.refreshTokens().then(res => {
            const { accessToken, refreshToken } = res;
            this._accessToken = accessToken;
            this._refreshToken = refreshToken;
            this.emmiter.emit("refresh", { accessToken, refreshToken });
            req.response.config.headers["Authorization"] = `Bearer ${accessToken}`;
            return Promise.resolve();
        }).catch(err => {
            this._ready = false;
            throw err;
        });

        createAuthRefreshInterceptor(this.instance, refresh);
    }

    get loginDetails() {
        return this._loginDetails;
    }

    get accessToken() {
        return this._accessToken;
    }

    get refreshToken() {
        return this._refreshToken;
    }

    get ready() {
        return this._ready;
    }

    destroy() {
        this.emmiter.removeAllListeners();
    }

    setCredentials(options: { loginDetails: LoginDetails, accessToken: string, refreshToken: string }) {
        this._loginDetails = options.loginDetails;
        this._accessToken = options.accessToken;
        this._refreshToken = options.refreshToken;
        this._ready = true;
    }

    async getPlaces(): Promise<SubscriberPlacesResponse> {
        const url = "https://api-mh.ertelecom.ru/rest/v1/subscriberplaces";

        return await this.instance.get(url).then(res => res.data);
    }

    async getProfile(): Promise<SubscriberProfileResponse> {
        const url = "https://api-mh.ertelecom.ru/rest/v1/subscribers/profiles";

        return await this.instance.get(url).then(res => res.data);
    }

    async getFinances(): Promise<SubscriberFinancesResponse> {
        const url = "https://api-mh.ertelecom.ru/rest/v1/subscribers/profiles/finances";

        return await this.instance.get(url).then(res => res.data);
    }

    async getForpostCameras(): Promise<ForpostCamerasResponse> {
        const url = "https://api-mh.ertelecom.ru/rest/v1/forpost/cameras";

        return await this.instance.get(url).then(res => res.data);
    }

    async getCameraSnapshot(cameraId: number) {
        const url = `https://api-mh.ertelecom.ru/rest/v1/forpost/cameras/${cameraId}/snapshots`;

        return await this.instance.get(url, { responseType: "stream" }).then(res => res.data);
    }

    async getCameraStream(cameraId: number) {
        const url = `https://api-mh.ertelecom.ru/rest/v1/forpost/cameras/${cameraId}/video`;

        return await this.instance.get(url)
            .then(res => {
                const { data } = res.data;
                if (data.Error) throw new Error(data.Error);
                return data.URL;
            })
            .catch((err: AxiosError) => {
                const code = err.response?.status;
                if (code === 500) throw new Error("Неправильный cameraId");
                throw err;
            });
    }

    async openAccessControl(placeId: number, accessControlId: number) {
        const url = `https://api-mh.ertelecom.ru/rest/v1/places/${placeId}/accesscontrols/${accessControlId}/actions`;
        const data = {
            name: "accessControlOpen"
        };

        return await this.instance.post(url, data)
            .then(() => Promise.resolve())
            .catch((err: AxiosError) => {
                const code = err.response?.status;
                if (code === 500) throw new Error("Неправильный placeId или accessControlId");
                throw err;
            });
    }

    async getOperators(): Promise<OperatorsResponse> {
        const url = "https://api-mh.ertelecom.ru/public/v1/operators";

        return await axios.get(url).then(res => res.data);
    }
    
    async getLoginDetails(phone: number) {
        const url = `https://api-mh.ertelecom.ru/auth/v2/login/${phone}`;

        return await axios.get(url, { validateStatus: (status) => status === 200 || status === 300 })
            .then(res => {
                return (<LoginDetailsResponse>res.data)
                    .map(item => ({ phone, ...item }))
            })
            .catch((err: AxiosError) => {
                const code = err.response?.status;
                if (code === 204) throw new Error("Неправильный номер");
                throw err;
            });
    }
    
    async sendConfirmation(loginDetails: LoginDetails) {
        const { phone, ...data } = loginDetails;
        const url = `https://api-mh.ertelecom.ru/auth/v2/confirmation/${phone}`;

        return await axios.post(url, data)
            .then(() => Promise.resolve())
            .catch((err: AxiosError) => {
                const code = err.response?.status;
                if (code === 400) throw new Error("Неправильные данные авторизации");
                throw err;
            });
    }
    
    async loginConfirmation(loginDetails: LoginDetails, code: number): Promise<LoginConfirmationResponse> {
        const url = `https://api-mh.ertelecom.ru/auth/v2/auth/${loginDetails.phone}/confirmation`;
        const data = {
            operatorId: loginDetails.operatorId,
            subscriberId: loginDetails.subscriberId,
            accountId: loginDetails.accountId,
            login: loginDetails.phone,
            confirm1: String(code)
        };

        return await axios.post(url, data)
            .then(res => res.data)
            .catch((err: AxiosError) => {
                const code = err.response?.status;
                if (code === 409) throw new Error("Неправильные данные авторизации");
                if (code === 403) throw new Error("Неправильный код подтверждения");
                throw err;
            });
    }
    
    private async refreshTokens() {
        const url = "https://api-mh.ertelecom.ru/auth/v2/session/refresh";
        const headers = {
            Bearer: this._refreshToken,
            Operator: String(this._loginDetails.operatorId)
        };

        return await axios.get(url, { headers }).then(res => res.data);
    }
}

export { API };