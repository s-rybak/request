/**
 * Creates request object
 * makes post and get request
 *
 * @param url
 * @param data
 * @param options
 * @constructor
 *
 */
const Request = function (url, data, options = {}) {

    if (typeof url === "undefined") {
        throw new URIError("Url must be a string ( link )")
    }

    if (typeof options !== "object" && !Array.isArray(options)) {
        throw new URIError("Options must be a object")
    }

    let Opt = Object.assign({
        headers: {},
        headersPreset: null,
        async: true,
        sendForm: false,
        responseUnserializer: "json",
        checkResponseDataStatus: true,
    }, options);

    let xhr = new XMLHttpRequest();

    /**
     * Waits for server response promise
     *
     * Resolves on server responce status=successs
     * Rejects on other server response
     *
     * @type {Promise<string|object>}
     */
    let process = new Promise(function (res, rej) {

        xhr.onreadystatechange = function () {
            if (this.readyState != XMLHttpRequest.DONE) return;

            try {

                let responseData = this.responseText;

                if (typeof Opt.responseUnserializer === "string") {

                    responseData = unserializeBy(responseData, Opt.responseUnserializer);

                }

                if (typeof Opt.responseUnserializer === "function") {

                    responseData = Opt.responseUnserializer.apply(this, [responseData, this.responseText]);

                }

                if (Opt.checkResponseDataStatus && (typeof responseData.status == "undefined" || responseData.status !== "success")) {

                    rej.apply(this, [typeof responseData.message != "undefined" ? responseData.message : "Unexpected responce", responseData, this.responseText]);

                    return;

                }

                res.apply(this, [responseData, this.responseText]);

            } catch (e) {

                rej.apply(this, [e.message])

            }

        };

        xhr.onerror = function (e) {

            rej.apply(this, [e])

        }

    });

    /**
     * Serialise object to url request string
     * Used in get request
     *
     * @param obj
     * @param prefix
     * @returns {string}
     */
    let serialize = function (obj, prefix) {
        let str = [], p;

        for (p in obj) {
            if (obj.hasOwnProperty(p)) {
                let k = prefix ? prefix + "[" + p + "]" : p,
                    v = obj[p];
                str.push((v !== null && typeof v === "object") ?
                    serialize(v, k) :
                    encodeURIComponent(k) + "=" + encodeURIComponent(v));
            }
        }
        return str.join("&");
    };


    let getFormData = function (serialiseData, form, prefix) {

        form = typeof form === "undefined" ? new FormData() : form;

        for (let name in serialiseData) {

            if (serialiseData.hasOwnProperty(name)) {

                let data = serialiseData[name];
                let formName = data instanceof Blob ? (!isNaN(parseFloat(name)) ? name : "file") : name;
                formName = prefix ? prefix + "[" + formName + "]" : formName;

                if (
                    data instanceof FileList ||
                    (typeof data === "object" && !(data instanceof Blob)) ||
                    Array.isArray(data)
                ) {

                    getFormData(data, form, formName);

                } else {

                    form.append(formName, serialiseData[name]);

                }

            }

        }

        return form;

    };

    let prepareData = function (data) {

        if (typeof data !== "undefined") {

            switch (true) {
                case Opt.sendForm :
                    data = typeof data === "object" ? getFormData(data) : data;
                    break;
                case is_json() :
                    data = typeof data === "object" ? JSON.stringify(data) : data;
                    break;
                case is_json() :
                    data = typeof data === "object" ? serialize(data) : data;
                    break;

            }

        } else {

            data = null;

        }

        return data;

    };

    /**
     * Sends Data
     *
     * @param json
     */
    let send = json => {

        if (Opt.headersPreset !== null) {

            if (
                typeof Request.presetHeaders !== "undefined" &&
                typeof Request.presetHeaders[Opt.headersPreset] !== "undefined"
            ) {

                this.setHeaders(Request.presetHeaders[Opt.headersPreset])

            } else {

                throw new Error("Header preset ( " + Opt.headersPreset + " ) is not defined");

            }

        }

        setHeaders();
        xhr.send(json ? json : null);

    };

    /**
     * Sets header in xhr object before request
     */
    let setHeaders = function () {

        for (let name in Opt.headers) {

            if (Opt.headers.hasOwnProperty(name) && Opt.headers[name]) {

                xhr.setRequestHeader(name, getStringValue(Opt.headers[name]));

            }

        }

    };

    /**
     * Get string value
     *
     * @param value
     * @returns {string}
     */
    let getStringValue = function (value) {

        return typeof value === "string" ?
            value :
            (typeof value === "function" ? getStringValue(value()) : serialize(value));

    };

    /**
     * Check if json content type presents in request headers
     *
     * @returns {boolean}
     */
    let is_json = function () {

        return (typeof Opt.headers['Content-Type'] !== 'undefined' && Opt.headers['Content-Type'].toLowerCase() === "application/json") ||
            (typeof Opt.headers['Content-type'] !== 'undefined' && Opt.headers['Content-type'].toLowerCase() === "application/json");

    };

    /**
     * Check if urlencoded content type presents in request headers
     *
     * @returns {boolean}
     */
    let is_urlEncoded = function () {

        return (typeof Opt.headers['Content-Type'] !== 'undefined' && Opt.headers['Content-Type'].toLowerCase() === "application/x-www-form-urlencoded") ||
            (typeof Opt.headers['Content-type'] !== 'undefined' && Opt.headers['Content-type'].toLowerCase() === "application/x-www-form-urlencoded");

    };

    /**
     * Serialise Data by preseted serialisers
     * @param data
     * @param serialiser
     * @return {*}
     */
    let serializeBy = function (data, serialiser = "json") {

        return Request.getSerializer(serialiser).serialize(data);

    };

    /**
     * Unserialise Data by preseted serialisers
     * @param data
     * @param serialiser
     * @return {*}
     */
    let unserializeBy = function (data, serialiser = "json") {

        return Request.getSerializer(serialiser).unserialize(data);

    }

    this.onProgress = function (fn) {

        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                fn((e.loaded / e.total) * 100);
            }
        };

        return this;

    }

    /**
     * Make current request async
     *
     * @returns {Request}
     */
    this.async = function () {

        Opt.async = true;

        return this;

    };

    /**
     * Make current request sync
     *
     * @returns {Request}
     */
    this.sync = function () {

        Opt.async = false;

        return this;
    };

    /**
     * Send data as form encoded
     */
    this.setFormSerialiser = function () {

        Opt.sendForm = true;

        return this;

    }

    /**
     * Set request headers
     *
     * @param newHeaders
     */
    this.setHeaders = function (newHeaders) {

        if (typeof newHeaders === "object") {

            Opt.headers = Object.assign(Opt.headers, newHeaders);

            return this;

        }

        throw new TypeError("newHeaders must be object name:value");

    };

    /**
     * Removes header
     *
     * @param name
     * @returns {Request}
     */
    this.removeHeader = function (name) {

        if (typeof name === "string") {

            if (typeof Opt.headers[name] !== "undefined") {

                delete (Opt.headers[name])

            }

            return this;

        }

        throw new TypeError("newHeaders must be object name:value");

    };

    /**
     * Sets json content type header
     *
     * @returns {Request}
     */
    this.setJsonHeaders = function () {

        this.setHeaders({
            'Content-Type': "application/json",
            'Accept': "application/json",
        });

        return this;

    };

    /**
     * Sets urlencoded content type header
     *
     * @returns {Request}
     */
    this.setUrlEncHeaders = function () {

        this.setHeaders({
            'Content-Type': "application/x-www-form-urlencoded",
        });

        return this;
    };

    /**
     * Defines headers preset
     *
     * @param name
     * @returns {Request}
     */
    this.usePreset = function (name) {

        if (typeof name === "string") {

            Opt.headersPreset = name;

            return this;

        }

        throw new TypeError("name must be a string");

    };

    /**
     * Make post request
     *
     * @returns {Promise<string|object>}
     */
    this.post = function () {

        xhr.open("POST", url, Opt.async);

        send(
            prepareData(data)
        );
        return process;

    };

    /**
     * Make delete request
     *
     * @returns {Promise<string|object>}
     */
    this.delete = function () {

        xhr.open("DELETE", url +
            (typeof data === "undefined" ? "" : "?" + serialize(data))
            , Opt.async);

        send();
        return process;

    };

    /**
     * Make get request
     *
     * @returns {Promise<string|object>}
     */
    this.get = function () {

        xhr.open("GET", url +
            (typeof data === "undefined" ? "" : "?" + serialize(data))
            , Opt.async);
        send();
        return process;

    };


};

/**
 * Presets headers to all request
 *
 * @param name
 * @param object
 */
Request.setPresetHeaders = function (name, object) {

    if (typeof object === 'object') {

        this.presetHeaders = typeof this.presetHeaders === "undefined" ? {} : this.presetHeaders;
        this.presetHeaders[name] = object;

    }

};

/**
 * Clear preseted headers
 *
 * @param name
 */
Request.clearPresetHeaders = function (name) {

    if (typeof name !== "undefined" && typeof this.presetHeaders !== "undefined") {

        delete (this.presetHeaders[name]);

    }

};

/**
 * Add serialiser
 *
 * @param name
 * @param serialize serialize function
 * @param unserialize unserialize function
 */
Request.addSerializer = function (name, serialize, unserialize) {

    if (
        typeof name === "string" &&
        typeof serialize === "function" &&
        typeof unserialize === "function"
    ) {

        this.serializers = typeof this.serializers !== "undefined" ? this.serializers : {};

        this.serializers[name] = {serialize, unserialize};

    }

};

/**
 * Get serializer
 *
 * @param name
 * @return {*}
 * @throws Error when serializer not found
 */
Request.getSerializer = function (name) {

    this.serializers = typeof this.serializers !== "undefined" ? this.serializers : {};

    if (typeof name === "string" && typeof this.serializers[name] !== "undefined") {

        return this.serializers[name];

    }

    throw new Error("Serialiser " + name + " not found");
};


/**
 * Add json serialiser
 */
Request.addSerializer("json",
    function (data) {
        return JSON.stringify(data);
    },
    function (data) {
        return JSON.parse(data);
    }
);

