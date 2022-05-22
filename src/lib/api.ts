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

    private _instance: AxiosInstance;
    private _emmiter: EventEmitter;

    constructor() {
        this._ready = false;
        this._instance = axios.create();
        this._emmiter = new EventEmitter();

        this._instance.interceptors.request.use(req => {
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
            this._emmiter.emit("refresh", { accessToken, refreshToken });
            req.response.config.headers["Authorization"] = `Bearer ${accessToken}`;
            return Promise.resolve();
        }).catch(err => {
            this._ready = false;
            throw err;
        });

        createAuthRefreshInterceptor(this._instance, refresh);
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

    get instance() {
        return this._instance;
    }

    get emmiter() {
        return this._emmiter;
    }

    destroy() {
        this._emmiter.removeAllListeners();
    }

    setCredentials(options: { loginDetails: LoginDetails, accessToken: string, refreshToken: string }) {
        this._loginDetails = options.loginDetails;
        this._accessToken = options.accessToken;
        this._refreshToken = options.refreshToken;
        this._ready = true;
    }

    async getPlaces() {
        const url = "https://api-mh.ertelecom.ru/rest/v1/subscriberplaces";

        return await this._instance.get(url).then(res => {
            const { data }: SubscriberPlacesResponse = res.data;
            return data.map(({ place }) => place);
        });
    }

    async getPlace(placeId: number) {
        return await this.getPlaces().then(places => {
            const place = places.find(place => place.id === placeId);
            if (!place) throw new Error("Место не существует");
            return place;
        });
    }

    async getProfile(): Promise<SubscriberProfileResponse> {
        const url = "https://api-mh.ertelecom.ru/rest/v1/subscribers/profiles";

        return await this._instance.get(url).then(res => res.data);
    }

    async getFinances(): Promise<SubscriberFinancesResponse> {
        const url = "https://api-mh.ertelecom.ru/rest/v1/subscribers/profiles/finances";

        return await this._instance.get(url).then(res => res.data);
    }

    async getForpostCameras() {
        const url = "https://api-mh.ertelecom.ru/rest/v1/forpost/cameras";

        return await this._instance.get(url).then(res => {
            const { data }: ForpostCamerasResponse = res.data;
            return data;
        });
    }

    async getOperators(): Promise<OperatorsResponse> {
        const url = "https://api-mh.ertelecom.ru/public/v1/operators";

        return await axios.get(url).then(res => res.data);
    }
    
    async getLoginDetails(phone: number) {
        const url = `https://api-mh.ertelecom.ru/auth/v2/login/${phone}`;
        
        const phoneString = phone.toString();
        if (phoneString.length !== 11 && !(phoneString.startsWith("7") || phoneString.startsWith("8")))
            throw new Error("Неправильный номер телефона");

        return await axios.get(url, { validateStatus: (status) => status === 200 || status === 300 })
            .then(res => {
                return (<LoginDetailsResponse>res.data)
                    .map(item => ({ phone, ...item }))
            })
            .catch((err: AxiosError) => {
                const code = err.response?.status;
                if (code === 204) throw new Error("Договоры не найдены");
                if (code === 400) throw new Error("Неправильный номер телефона");
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