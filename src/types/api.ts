export type OperatorsResponse = {
    data: {
        id: number;
        dispName: string;
        location: {
            coordinates: {
                minPoint: {
                    longitude: number;
                    latitude: number;
                };
                maxPoint: {
                    longitude: number;
                    latitude: number;
                };
            };
            accountIdPrefix: string;
        } | null;
        authUrl: string;
        infoUrl: string;
        mobileFeatures: string[];
    }[];
}

export type LoginDetailsResponse = {
    operatorId: number;
    subscriberId: number;
    accountId: string | null;
    placeId: number;
    address: string;
    profileId: string | null;
}[];

export type LoginConfirmationResponse = {
    operatorId: number;
    operatorName: string;
    tokenType: "Bearer";
    accessToken: string;
    expiresIn: number | null;
    refreshToken: string;
    refreshExpiresIn: number | null;
}

export type SubscriberPlacesResponse = {
    data: {
        id: number;
        subscriberType: "owner" | "guest";
        subscriberState: string;
        place: {
            id: number;
            address: {
                kladrAddress: {
                    index: string | null;
                    region: string | null;
                    district: string | null;
                    city: string | null;
                    locality: string | null;
                    street: string | null;
                    house: string | null;
                    building: string | null;
                    apartment: string | null;
                };
                kladrAddressString: string;
                visibleAddress: string;
                groupName: string;
            };
            location: {
                longitude: number;
                latitude: number;
            };
            autoArmingState: boolean;
            autoArmingRadius: number;
            previewAvailable: boolean;
            videoDownloadAvailable: boolean;
            controllers: any[];
            accessControls: {
                id: number;
                name: string;
                forpostGroupId: string;
                forpostAccountId: string | null;
                type: string;
                allowOpen: boolean;
                allowVideo: boolean;
                allowCallMobile: boolean;
                entrances: any[];
            }[];
            cameras: any[];
        };
        subscriber: {
            id: number;
            name: string;
            accountId: string;
            nickName: string | null;
        };
        guardCallOut: any | null;
        payment: {
            useLink: boolean;
        };
        blocked: boolean;
    }[]
}

export type SubscriberProfileResponse = {
    data: {
        allowAddPhone: boolean;
        subscriber: {
            id: number;
            accountId: string;
            nickName: string | null;
            name: string;
        };
        pushUserId: string;
        callSelectedPlaceOnly: boolean;
        checkPhoneForSvcActivation: boolean;
        subscriberPhones: {
            id: number;
            number: string;
            numberValid: boolean;
        }[];
    }
}

export type SubscriberFinancesResponse = {
    balance: number | null;
    blockType: string;
    amountSum: number | null;
    targetDate: string | null;
    paymentLink: string | null;
    blocked: boolean;
}

export type ForpostCamerasResponse = {
    data: {
        ID: number;
        Name: string;
        IsActive: number;
        IsSound: number;
        RecordType: number;
        Quota: number;
        MaxBandwidth: number | null;
        HomeMode: number;
        Devices: any;
        ParentGroups: {
            ID: number;
            Name: string;
            ParentID: number | null;
        }[];
        State: number;
        TimeZone: number;
        MotionDetectorMode: string;
        ParentID: string;
    }[]
}