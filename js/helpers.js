function arrayToObject(ary, keyName) {
    const obj = {};
    for (let v of ary) {
        obj[keyName] = v;
    }
    return obj;
}

/**
 * @param {Map} map
 * @return object
 */
function mapToObject(map) {
    return [...map.entries()].reduce((pre, [k, v]) => (pre[k] = v, pre), {});
}

/**
 * Create an HTMLElement with specified tag name, attributes and property values.
 * @param {string} tag
 * @param {Object<string,*>} attributes setAttribute(key, value) will be called for each attribute. To set attribute name only, set value to ''.
 * @param {Object<string,*>} properties HTMLElement[key] = value will be called for each property.
 * @return {HTMLElement} The created element.
 */
function createElement(tag, attributes = null, properties = null) {
    let ele = document.createElement(tag);
    if (attributes) {
        for (let key of Object.keys(attributes)) {
            ele.setAttribute(key, attributes[key] == null ? '' : attributes[key]);
        }
    }
    if (properties) {
        for (let key of Object.keys(properties)) {
            ele[key] = properties[key];
        }
    }
    return ele;
}

/**
 * Create and append an HTMLElement with specified tag name, attributes and property values.
 * @param {string} tag
 * @param {Object<string,string>} attributes
 * @param {Object<string,Object>} properties
 * @return {HTMLElement} The parent element.
 */
HTMLElement.prototype.createElement = function (tag, attributes = null, properties = null) {
    this.appendChild(createElement(tag, attributes, properties));
    return this;
};

/**
 * @param str
 * @return {HTMLElement | HTMLCollection}
 */
function parseHTMLElement(str) {
    let ele = document.createElement('template');
    ele.innerHTML = str;
    return ele.content.childElementCount === 1 ? ele.content.firstElementChild : ele.content.children;
}

/**
 * Go up through the DOM tree and find the first element with the specified class.
 * @param {string} className
 * @return {HTMLElement | null}
 */
HTMLElement.prototype.getParentByClass = function (className) {
    let parent = this.parentElement;
    if (parent == null) return null;
    else {
        if (parent.classList.contains(className)) return parent;
        else return parent.getParentByClass(className);
    }
};

/**
 * Get the compare function based on the property supplied.
 * @param {string} prop
 */
function getCompareFunc(prop) {
    return (a, b) => a[prop] < b[prop] ? -1 : (a[prop] > b[prop] ? 1 : 0);
}

HTMLElement.prototype.clearChildNodes = function () {
    while (this.lastChild) {
        this.removeChild(this.lastChild);
    }
};

String.prototype.hashCode = function() {
    let hash = 0;
    if (this.length === 0) {
        return hash;
    }
    for (let i = 0; i < this.length; i++) {
        let char = this.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

function downloadFile(blob, filename) {
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
}

function uploadFile(callback) {
    var input = document.createElement('input');
    input.type = 'file';
    input.onchange = e => { 
        var file = e.target.files[0]; 

        var reader = new FileReader();
        reader.readAsText(file,'UTF-8');

        reader.onload = readerEvent => {
            var content = readerEvent.target.result;
            callback(content);
        }
    }
    input.click();
}