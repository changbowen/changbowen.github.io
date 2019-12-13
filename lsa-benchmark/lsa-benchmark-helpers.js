/**
 * The below properties are used.
 * index: Question title (string). Example: Question 1.
 * type: Question type (string). Allowed values: text, single-choice, multi-choice;
 * answer: The answer based on type and user input.
 */
class Question extends HTMLElement {
    static get observedAttributes() {
        return ['answer', 'type'];
    }

    get answer() { return this.getAttribute('answer'); }
    set answer(val) {
        if (val) this.setAttribute('answer', val);
        else this.removeAttribute('answer');
    }

    get type() { return this.getAttribute('type'); }
    set type(val) {
        if (val) this.setAttribute('type', val);
        else this.removeAttribute('type');
    }

    constructor() {
        super();
    }

    /*The question header element*/
    get question_head() {
        return this.getElementsByClassName('question-head')[0];
    }

    /*The question body elements*/
    get question_bodies() {
        return [...this.getElementsByClassName('question-body')];
    }

    /*The question answer elements*/
    get question_answers() {
        return [...this.getElementsByClassName('question-answer')];
    }

    connectedCallback() {
        this.className = 'question';
        if (!this.type) this.type = 'text';

        //wait till element contents are rendered
        setTimeout(() => {
            if (!this.id) this.id = 'q-' + this.question_head.textContent.trim().hashCode();
            //type
            switch (this.type) {
                case 'text':
                    //load saved answer
                    loadAnswer(this);
                    //post init
                    this.question_answers.forEach(e => e.addEventListener('change', e => {
                        //save answer
                        saveAnswer(this);
                    }));
                    break;
                case 'single-choice':
                case 'single_choice':
                    //load saved answer
                    loadAnswer(this);
                    //init
                    for (const choice of this.getElementsByClassName('question-answer')) {
                        choice.style.cursor = 'pointer';
                        choice.addEventListener('click', e => {
                            //set selection status
                            this.question_answers.forEach(c => {
                                c.classList.remove('question-answer-selected');
                            });
                            e.currentTarget.classList.add('question-answer-selected');
                            //save answer
                            saveAnswer(this);
                        });
                    }
                    break;
                case 'multi-choice':
                case 'multi_choice':
                    //load saved answer
                    loadAnswer(this);
                    //init
                    for (const choice of this.getElementsByClassName('question-answer')) {
                        choice.style.cursor = 'pointer';
                        choice.addEventListener('click', e => {
                            //set selection status
                            e.currentTarget.classList.toggle('question-answer-selected');
                            //save answer
                            saveAnswer(this);
                        });
                    }
                    break;
            }
        });
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
}

function loadAnswer(/*Question*/question) {
    let stor = JSON.parse(localStorage.getItem(question.id));
    if (!stor || !stor.answer) return;
    switch (question.type) {
        case 'text':
            let ans = question.question_answers;
            for (let i = 0; i < Math.min(ans.length, stor.answer.length); i++) {
                ans[i].value = stor.answer[i];
            }
            break;
        case 'single-choice':
        case 'single_choice':
        case 'multi-choice':
        case 'multi_choice':
            if (Object.keys(stor.answer).length === 0) break;
            let selected = question.question_answers.filter(e => stor.answer.hasOwnProperty(e.getAttribute('value')));
            if (selected.length > 0) selected.forEach(e => e.classList.add('question-answer-selected'));
            break;
    }
}

function saveAnswer(/*Question*/question) {
    let entry_val = {
        question: question.question_bodies.map(e=>e.textContent.trim()),
        answer: null,
    };
    switch (question.type) {
        case 'text':
            if (question.question_answers.length === 0) break;
            entry_val.answer = question.question_answers.map(e=>e.value);
            break;
        case 'single-choice':
        case 'single_choice':
        case 'multi-choice':
        case 'multi_choice':
            entry_val.answer = [...question.getElementsByClassName('question-answer-selected')].reduce((pre, cur) => {
                pre[cur.getAttribute('value')] = cur.textContent.trim();
                return pre;
            }, {});
            break;
        default:
            return;
    }
    localStorage.setItem(question.id, JSON.stringify(entry_val));
}
window.customElements.define('ce-question', Question);

function saveAllAnswers() {
    [...document.getElementsByTagName('ce-question')].forEach(e=>saveAnswer(e));
}

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