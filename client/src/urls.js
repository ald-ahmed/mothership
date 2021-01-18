let Urls = {};

if (process.env.NODE_ENV === "production") {
    Urls = {
        baseURL: "http://localhost:3001/configs",
        socketURL: "http://localhost:1818/api/socket",
    };
} else {
    Urls = {
        baseURL: "/configs",
        socketURL: "http://10.0.0.122:1818/api/socket",
    };
}

export default Urls;