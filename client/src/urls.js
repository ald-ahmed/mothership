let Urls = {};

if (process.env.NODE_ENV === "production") {
    Urls = {
        baseURL: "/api",
        socketURL: "/api",
    };
} else {
    Urls = {
        baseURL: "/configs",
        socketURL: "http://10.0.0.122:1818/api/socket",
    };
}

export default Urls;