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

    static AutoSizeTimer = new Map();
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
        clearTimeout(Question.AutoSizeTimer.get(element));//reduce resize calls when typing
        Question.AutoSizeTimer.set(element, setTimeout(() => {
            //A hack to get the correct scrollHeight. Otherwise scrollHeight is not shrinking.
            let oldHeight = $(element).height() + 'px';
            element.style.height = initial;
            let newHeight = (element.scrollHeight - 18) + 'px';
            element.style.height = oldHeight;
            $(element).animate({ height: newHeight }, Question.BaseAnimDuration, 'swing', ()=>Question.AutoSizeTimer.delete(element));
        }, 200));
    }

    static saveAllAnswers(callback) {
        if (window.skipSaving) return;
        [...document.getElementsByTagName('ce-question')].forEach(e=>e.saveAnswer());
        if (callback) callback()
    }


    static clearAllAnswers() {
        if (confirm('Are you sure to clear all saved answers and reload? There is no going back!')) {
            window.skipSaving = true;
            localStorage.clear();
            location.reload();
        }
    }

    static toggleRefAnswers(callback) {
        if (!window.refAnswer && !Question.testDecryptKey()) return;
        let delay = 0;
        let pros = [];
        [...document.getElementsByTagName('ce-question')].forEach(question=> {
            pros.push(new Promise((resolve, reject) => {
                setTimeout(() => {
                    //show or hide reference answer. decryptKey should have been set
                    question.loadAnswer(!window.refAnswer);
                    //show or hide tip.
                    question.toggleTip(!window.refAnswer);
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

    static testDecryptKey() {
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
    static decrypt(gibberish) {
        if (!gibberish) return null;
        let key = localStorage.getItem('decryptKey');
        if (!key) return null;
        return CryptoJS.AES.decrypt(gibberish, key).toString(CryptoJS.enc.Utf8);
    }

    /**
     * Assumes decryptKey is set.
     * @param {string} text The string to encrypt.
     */
    static encrypt(text) {
        if (!text) return null;
        let key = localStorage.getItem('decryptKey');
        if (!key) return null;
        return CryptoJS.AES.encrypt(text, key).toString();
    }


    connectedCallback() {
        this.className = 'question';
        if (!this.type) this.type = Question.Types.Text;

        //wait till element contents are rendered
        setTimeout(() => {
            if (!this.id) this.id = 'q-' + this.question_bodies.map(b=>b.textContent.trim()).join('\n').hashCode();
            //load saved answer
            this.loadAnswer();
            //post init
            switch (this.type) {
                case Question.Types.Text:
                    this.question_answers.forEach(ans => {
                        ans.addEventListener('scroll', e => e.target.scrollTop = 0);//prevent scrolling due to height auto growth
                        ans.addEventListener('input', e => {
                            //auto grow height
                            e.target.scrollTop = 0;
                            Question.updateHeight(e.target);
                        });
                        ans.addEventListener('change', e => this.saveAnswer());
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
                            this.saveAnswer();
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
                            this.saveAnswer();
                        });
                    });
                    break;
            }
        });
    }

    /**
     * Load answer from localStorage (saved answer) or the answer attribute (reference answer).
     * @param {boolean} refAnswer
     */
    loadAnswer(refAnswer = false) {
        let stor;
        if (refAnswer) {
            //load reference answer. decryptKey should have been set
            let decrypted = Question.decrypt(this.answer);
            if (!decrypted) return;
            stor = { answer: JSON.parse(decrypted) };
        }
        else {
            stor = JSON.parse(localStorage.getItem(this.id));
        }

        //reset state / clear selections
        this.question_answers.forEach(e => {
            e.classList.remove(Question.Classes.RefAnswer);
            if (refAnswer) e.classList.add(Question.Classes.RefAnswer);

            switch (this.type) {
                case Question.Types.Text:
                    e.value = null;
                    Question.updateHeight(e);
                    break;
                case Question.Types.SingleChoice:
                case Question.Types.MultiChoice:
                    e.classList.remove(Question.Classes.Selected);
                    break;
            }
        });

        if (!stor || !stor.answer) return;
        switch (this.type) {
            case Question.Types.Text:
                let ans = this.question_answers;
                for (let i = 0; i < ans.length; i++) {
                    ans[i].value = null;
                    if (i < stor.answer.length) {
                        ans[i].value = stor.answer[i];
                    }
                    Question.updateHeight(ans[i]);
                }
                break;
            case Question.Types.SingleChoice:
            case Question.Types.MultiChoice:
                if (Object.keys(stor.answer).length === 0) break;
                let selected = this.question_answers.filter(e => stor.answer.hasOwnProperty(e.getAttribute('value')));
                if (selected.length > 0) selected.forEach(e => {
                    e.classList.add(Question.Classes.Selected);
                });
                break;
        }
    }

    saveAnswer() {
        if (window.skipSaving) return;

        let stor = {
            question: this.question_bodies.map(e=>e.textContent.trim()),
            answer: null,
        };
        switch (this.type) {
            case Question.Types.Text:
                if (this.question_answers.length === 0) break;
                stor.answer = this.question_answers.map(e=>e.value);
                break;
            case Question.Types.SingleChoice:
            case Question.Types.MultiChoice:
                stor.answer = [...this.getElementsByClassName(Question.Classes.Selected)].reduce((pre, cur) => {
                    pre[cur.getAttribute('value')] = cur.textContent.trim();
                    return pre;
                }, {});
                break;
            default:
                return;
        }
        localStorage.setItem(this.id, JSON.stringify(stor));
    }

    toggleTip(/*boolean*/show) {
        let tipElement = this.question_tip;
        if (!tipElement) return;
        if (show) {
            let tipStr = Question.decrypt(this.tip);
            if (!tipStr) return;
            //create element from template
            for (const ele of document.getElementById('popup-tip').content.children) {
                tipElement.append(ele.cloneNode(true));
            }
            tipElement.querySelector('#popup-tip-text').textContent = tipStr;
            $(tipElement).slideDown(Question.BaseAnimDuration);
        }
        else {
            $(tipElement).slideUp(Question.BaseAnimDuration, ()=>tipElement.innerHTML = '');
        }
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

window.customElements.define('ce-question', Question);
