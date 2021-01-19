

let urls = {
    baseURL: "/configs",
    socketURL: "/api/socket",
};

// in case urls need to be changed for different environments
if (process.env.NODE_ENV === "production") {
    urls = {
        baseURL: "/configs",
        socketURL: "/api/socket",
    };
}

export default urls;