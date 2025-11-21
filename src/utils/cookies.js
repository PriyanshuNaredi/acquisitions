export const cookie = {
    getOptions: () => ( {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // Default: 15 minutes
    }),
    set : (res, name, value, options = {}) => {
        res.cookie(name, value, { ...cookie.getOptions(), ...options });
    },
    clear: (res, name, options = {}) => {
        res.clearCookie(name, { ...cookie.getOptions(), ...options });
    },
    get: (req, name) => {
        return req.cookies[name];
    }
}