import pgsql from "./postgres.js";

export const validateEmail = (() => {
    const re = /^(?=.{1,254}$)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/; 
    return (email) => re.test(String(email));
})();

export const validateUsername = (() => {
    const re = /^[a-z0-9._]{1,32}$/; 
    return (username) => re.test(String(username));
})();

export const validatePassword = (() => {
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&#\.]{8,}$/
    return (password) => re.test(password);
})();

export const validateDisplayName = (() => {
    return (displayName) => displayName.length <= 64;
})();

export const validateGroupName = (() => {
    return (groupName) => groupName.length <= 64;
})();
