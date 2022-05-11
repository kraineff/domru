import axios, { AxiosInstance } from "axios";
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

class API extends EventEmitter {
    operatorId!: number;
    accessToken!: string;
    refreshToken!: string;
    instance: AxiosInstance;

    constructor() {
        super();
        this.instance = axios.create();

        this.instance.interceptors.request.use(req => {
            if (!this.accessToken) throw new Error("Нет авторизации");
            req.headers = {
                ...req.headers,
                Authorization: `Bearer ${this.accessToken}`,
                Operator: String(this.operatorId)
            };
            return req;
        });

        const refresh = async (req: any) => this.refreshTokens().then(res => {
            const { accessToken, refreshToken } = res;
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.emit("refresh", { accessToken, refreshToken });
            req.response.config.headers["Authorization"] = `Bearer ${accessToken}`;
            return Promise.resolve();
        });

        createAuthRefreshInterceptor(this.instance, refresh);
    }

    setCredentials(options: { operatorId: number, accessToken: string, refreshToken: string }) {
        this.operatorId = options.operatorId;
        this.accessToken = options.accessToken;
        this.refreshToken = options.refreshToken;
    }

    async getPlaces(): Promise<SubscriberPlacesResponse> {
        return this.instance.get("https://api-mh.ertelecom.ru/rest/v1/subscriberplaces").then(res => res.data);
    }

    async getProfile(): Promise<SubscriberProfileResponse> {
        return this.instance.get("https://api-mh.ertelecom.ru/rest/v1/subscribers/profiles").then(res => res.data);
    }

    async getFinances(): Promise<SubscriberFinancesResponse> {
        return this.instance.get("https://api-mh.ertelecom.ru/rest/v1/subscribers/profiles/finances").then(res => res.data);
    }

    async getForpostCameras(): Promise<ForpostCamerasResponse> {
        return this.instance.get("https://api-mh.ertelecom.ru/rest/v1/forpost/cameras").then(res => res.data);
    }

    async getCameraSnapshot(cameraId: number) {
        return this.instance.get(`https://api-mh.ertelecom.ru/rest/v1/forpost/cameras/${cameraId}/snapshots`, {
            responseType: "stream"
        }).then(res => res.data);
    }

    async getCameraStream(cameraId: number) {
        return this.instance.get(`https://api-mh.ertelecom.ru/rest/v1/forpost/cameras/${cameraId}/video`).then(res => {
            const { data } = res.data;
            if (data.Error) throw new Error(data.Error);
            return data.URL;
        });
    }

    async openAccessControl(placeId: number, accessControlId: number) {
        return this.instance.post(`https://api-mh.ertelecom.ru/rest/v1/places/${placeId}/accesscontrols/${accessControlId}/actions`, {
            name: "accessControlOpen"
        }).then(() => Promise.resolve());
    }

    async getOperators(): Promise<OperatorsResponse> {
        return axios.get("https://api-mh.ertelecom.ru/public/v1/operators").then(res => res.data);
    }
    
    async getLoginDetails(phone: number) {
        return axios.get(`https://api-mh.ertelecom.ru/auth/v2/login/${phone}`, {
            validateStatus: (status) => status === 200 || status === 300,
        }).then(res => (<LoginDetailsResponse>res.data).map(item => ({ phone, ...item })));
    }
    
    async sendConfirmation(loginDetails: LoginDetails) {
        const { phone, ...details } = loginDetails;
        return axios.post(`https://api-mh.ertelecom.ru/auth/v2/confirmation/${phone}`, details)
            .then(() => Promise.resolve());
    }
    
    async loginConfirmation(loginDetails: LoginDetails, code: number): Promise<LoginConfirmationResponse> {
        return axios.post(`https://api-mh.ertelecom.ru/auth/v2/auth/${loginDetails.phone}/confirmation`, {
            operatorId: loginDetails.operatorId,
            subscriberId: loginDetails.subscriberId,
            accountId: loginDetails.accountId,
            login: loginDetails.phone,
            confirm1: String(code)
        }).then(res => res.data);
    }
    
    private async refreshTokens() {
        return axios.get("https://api-mh.ertelecom.ru/auth/v2/session/refresh", {
            headers: {
                Bearer: this.refreshToken,
                Operator: String(this.operatorId)
            }
        }).then(res => res.data);
    }
}

export { API };