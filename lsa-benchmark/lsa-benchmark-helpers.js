/**
 * The below properties are used.
 * type: Question type (string). Allowed values: text, single-choice, multi-choice;
 * answer: The encrypted reference answer.
 */
class Question extends HTMLElement {
    /**
     * This is the encrypted answer.
     */
    get answer() { return this.getAttribute('answer'); }
    set answer(val) {
        if (val) this.setAttribute('answer', val);
        else this.removeAttribute('answer');
    }

    /**
     * This is the encrypted tip to the question.
     */
    get tip() { return this.getAttribute('tip'); }
    set tip(val) {
        if (val) this.setAttribute('tip', val);
        else this.removeAttribute('tip');
    }

    get type() { return this.getAttribute('type'); }
    set type(val) {
        if (val) this.setAttribute('type', val);
        else this.removeAttribute('type');
    }

    constructor() {
        super();
    }

    static Classes = {
        Head: 'question-head',
        Body: 'question-body',
        Answer: 'question-answer',
        Select: 'question-answer-select',
        Selected: 'question-answer-selected',
        RefAnswer: 'question-ref-answer',
        Tip: 'question-tip',
    };

    static Types = {
        Text: 'text',
        SingleChoice: 'single-choice',
        MultiChoice: 'multi-choice',
    };

    static AutoSizeTimer;
    static BaseAnimDuration = 300;

    /**
     * The question header element
     * @returns {Element}
     */
    get question_head() {
        return this.getElementsByClassName(Question.Classes.Head)[0];
    }

    /**
     * The question body elements
     * @returns {Element[]}
     */
    get question_bodies() {
        return [...this.getElementsByClassName(Question.Classes.Body)];
    }

    /**
     * The question tip element
     * @returns {Element | null}
     */
    get question_tip() {
        let tipCol = this.getElementsByClassName(Question.Classes.Tip);
        return tipCol.length > 0 ? tipCol[0] : null;
    }

    /**
     * The question answer elements
     * @returns {Element[]}
     */
    get question_answers() {
        return [...this.getElementsByClassName(Question.Classes.Answer)];
    }

    static updateHeight(element, initial = '1.6em') {
        //A hack to get the correct scrollHeight. Otherwise scrollHeight is not shrinking.
        let oldHeight = $(element).height() + 'px';
        element.style.height = initial;
        let newHeight = (element.scrollHeight - 18) + 'px';
        element.style.height = oldHeight;
        $(element).animate({ height: newHeight }, this.BaseAnimDuration);
    }

    static updateRefAnswer(element, isRef) {
        if (isRef) element.classList.add(Question.Classes.RefAnswer);
        else element.classList.remove(Question.Classes.RefAnswer);
    }


    connectedCallback() {
        this.className = 'question';
        if (!this.type) this.type = Question.Types.Text;

        //wait till element contents are rendered
        setTimeout(() => {
            if (!this.id) this.id = 'q-' + this.question_bodies.map(b=>b.textContent.trim()).join('\n').hashCode();
            //load saved answer
            loadAnswer(this);
            //post init
            switch (this.type) {
                case Question.Types.Text:
                    this.question_answers.forEach(ans => {
                        ans.addEventListener('scroll', e => e.target.scrollTop = 0);//prevent scrolling due to height auto growth
                        ans.addEventListener('input', e => {
                            //auto grow height
                            e.target.scrollTop = 0;
                            clearTimeout(Question.AutoSizeTimer);//reduce resize calls when typing
                            Question.AutoSizeTimer = setTimeout(()=>Question.updateHeight(e.target), 200);
                        });
                        ans.addEventListener('change', e => saveAnswer(this));
                    });
                    break;
                case Question.Types.SingleChoice:
                    this.question_answers.forEach(ans => {
                        ans.style.cursor = 'pointer';
                        ans.addEventListener('click', e => {
                            //set selection status
                            this.question_answers.forEach(c => {
                                c.classList.remove(Question.Classes.Selected);
                            });
                            e.currentTarget.classList.add(Question.Classes.Selected);
                            //save answer
                            saveAnswer(this);
                        });
                    });
                    break;
                case Question.Types.MultiChoice:
                    this.question_answers.forEach(ans => {
                        ans.style.cursor = 'pointer';
                        ans.addEventListener('click', e => {
                            //set selection status
                            e.currentTarget.classList.toggle(Question.Classes.Selected);
                            //save answer
                            saveAnswer(this);
                        });
                    });
                    break;
            }
        });
    }

/*
    static get observedAttributes() {
        return ['answer', 'type'];
    }
    attributeChangedCallback(attrName, oldVal, newVal) {
        if (null === oldVal || oldVal === newVal) return;
        //update rendered content
        let ele_collection, callback;
        switch (attrName) {
            case 'head':
                ele_collection = this.getElementsByClassName('question question-head');
                callback = (ele, val) => ele.textContent = val;
                break;
        }

        for (const ele of ele_collection) {
            callback(ele, newVal);
        }
    }
*/
}

/**
 * Load answer from localStorage (saved answer) or the answer attribute (reference answer).
 * @param {Question} question
 * @param {boolean} refAnswer
 */
function loadAnswer(question, refAnswer = false) {
    let stor;
    if (refAnswer) {
        //load reference answer. decryptKey should have been set
        let decrypted = decrypt(question.answer);
        if (!decrypted) return;
        stor = { answer: JSON.parse(decrypted) };
    }
    else
        stor = JSON.parse(localStorage.getItem(question.id));

    if (!stor || !stor.answer) return;
    switch (question.type) {
        case Question.Types.Text:
            let ans = question.question_answers;
            ans.forEach(e=>{ e.value = null; });//clear all text fields
            for (let i = 0; i < Math.min(ans.length, stor.answer.length); i++) {
                ans[i].value = stor.answer[i];
                Question.updateRefAnswer(ans[i], refAnswer);
                setTimeout(() => Question.updateHeight(ans[i]));
            }
            break;
        case Question.Types.SingleChoice:
        case Question.Types.MultiChoice:
            question.question_answers.forEach(e=> {
                e.classList.remove(Question.Classes.Selected, Question.Classes.RefAnswer);
            });//clear selections
            if (Object.keys(stor.answer).length === 0) break;
            let selected = question.question_answers.filter(e => stor.answer.hasOwnProperty(e.getAttribute('value')));
            if (selected.length > 0) selected.forEach(e => {
                e.classList.add(Question.Classes.Selected);
                if (refAnswer) e.classList.add(Question.Classes.RefAnswer);
            });
            break;
    }
}

function saveAnswer(/*Question*/question) {
    if (window.skipSaving) return;

    let stor = {
        question: question.question_bodies.map(e=>e.textContent.trim()),
        answer: null,
    };
    switch (question.type) {
        case Question.Types.Text:
            if (question.question_answers.length === 0) break;
            stor.answer = question.question_answers.map(e=>e.value);
            break;
        case Question.Types.SingleChoice:
        case Question.Types.MultiChoice:
            stor.answer = [...question.getElementsByClassName(Question.Classes.Selected)].reduce((pre, cur) => {
                pre[cur.getAttribute('value')] = cur.textContent.trim();
                return pre;
            }, {});
            break;
        default:
            return;
    }
    localStorage.setItem(question.id, JSON.stringify(stor));
}

function toggleTip(/*Question*/question, /*boolean*/show) {
    let tipElement = question.question_tip;
    if (!tipElement) return;
    if (show) {
        let tipStr = decrypt(question.tip);
        if (!tipStr) return;
        //create element from template
        for (const ele of document.getElementById('popup-tip').content.children) {
            tipElement.append(ele.cloneNode(true));
        }
        tipElement.querySelector('#popup-tip-text').textContent = tipStr;
        $(tipElement).slideDown(this.BaseAnimDuration);
    }
    else {
        $(tipElement).slideUp(this.BaseAnimDuration, ()=>tipElement.innerHTML = '');
    }
}

window.customElements.define('ce-question', Question);


function saveAllAnswers(callback) {
    if (window.skipSaving) return;
    [...document.getElementsByTagName('ce-question')].forEach(e=>saveAnswer(e));
    if (callback) callback()
}

function clearAllAnswers() {
    if (confirm('Are you sure to clear all saved answers and reload? There is no going back!')) {
        window.skipSaving = true;
        localStorage.clear();
        location.reload();
    }
}

function toggleRefAnswers(callback) {
    if (!window.refAnswer && !testDecryptKey()) return;
    let delay = 0;
    let pros = [];
    [...document.getElementsByTagName('ce-question')].forEach(question=> {
        pros.push(new Promise((resolve, reject) => {
            setTimeout(() => {
                //show or hide reference answer. decryptKey should have been set
                loadAnswer(question, !window.refAnswer);
                //show or hide tip.
                toggleTip(question, !window.refAnswer);
                resolve();
            }, delay);
            delay += 100;
        }));
    });
    Promise.all(pros).then(()=>{
        window.refAnswer = !window.refAnswer;
        window.skipSaving = window.refAnswer;
    }).then(()=>setTimeout(callback, this.BaseAnimDuration + 100));
}

function testDecryptKey() {
    while (true) {
        //check if key is set
        if (!localStorage.getItem('decryptKey')) {
            let key = prompt('Input the decryption key if you have it.');
            if (!key) break;
            localStorage.setItem('decryptKey', key);
        }
        //test if key is correct
        let key = localStorage.getItem('decryptKey');
        if (CryptoJS.AES.decrypt('U2FsdGVkX18rL1WTaSQeSym4/dND2ADvi3dOQR3eTsM=', key).toString(CryptoJS.enc.Utf8) === 'test')
            return true;
        else {
            localStorage.removeItem('decryptKey');
            alert('Invalid decryption key.');
        }
    }
    return false;
}

/**
 * Assumes decryptKey is set.
 * @param {string} gibberish The encrypted string.
 */
function decrypt(gibberish) {
    if (!gibberish) return null;
    let key = localStorage.getItem('decryptKey');
    if (!key) return null;
    return CryptoJS.AES.decrypt(gibberish, key).toString(CryptoJS.enc.Utf8);
}

/**
 * Assumes decryptKey is set.
 * @param {string} text The string to encrypt.
 */
function encrypt(text) {
    if (!text) return null;
    let key = localStorage.getItem('decryptKey');
    if (!key) return null;
    return CryptoJS.AES.encrypt(text, key).toString();
}
