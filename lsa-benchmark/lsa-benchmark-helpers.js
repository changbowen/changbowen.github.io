/**
 * The below properties are used.
 * index: Question title (string). Example: Question 1.
 * type: Question type (string). Allowed values: text, single-choice, multi-choice;
 * answer: The answer based on type and user input.
 */
class Question extends HTMLElement {
    static get observedAttributes() {
        return ['index', 'answer', 'type'];
    }

    get index() {
        return this.getAttribute('index');
    }
    set index(val) {
        if (val) this.setAttribute('index', val);
        else this.removeAttribute('index');
    }

    get answer() {
        return this.getAttribute('answer');
    }
    set answer(val) {
        if (val) this.setAttribute('answer', val);
        else this.removeAttribute('answer');
    }

    get type() {
        return this.getAttribute('type');
    }
    set type(val) {
        if (val) this.setAttribute('type', val);
        else this.removeAttribute('type');
    }

    constructor() {
        super();
    }

    connectedCallback() {
        if (!this.index) throw new Error('Question index is not defined!');

        this.className = 'question';
        if (!this.id) this.id = 'q-' + this.index;
        if (!this.type) this.type = 'text';

        //render element content
        setTimeout(() => {
            //head
            this.question_head = this.getElementsByClassName('question-head')[0];
            this.question_head.id = 'qh-' + this.index;
            //body
            this.question_body = this.getElementsByClassName('question-body')[0];
            this.question_body.id = 'qb-' + this.index;
            //type
            switch (this.type) {
                case 'text':
                    let textarea = this.getElementsByClassName('question-text')[0];
                    textarea.id = 'ta-' + this.index;
                    textarea.addEventListener('change', e => {
                        console.log(e.currentTarget.value)
                    });
                    break;
                case 'single-choice':
                case 'single_choice':
                    //load saved answer
                    loadChoiceAnswer(this);
                    //init
                    for (const choice of this.getElementsByClassName('question-choice')) {
                        choice.style.cursor = 'pointer';
                        choice.addEventListener('click', e => {
                            //set selection status
                            [...this.getElementsByClassName('question-choice')].forEach(c => {
                                c.classList.remove('question-choice-selected');
                            });
                            e.currentTarget.classList.add('question-choice-selected');
                            //save answer
                            saveChoiceAnswer(this);
                        });
                    }
                    break;
                case 'multi-choice':
                case 'multi_choice':
                    //load saved answer
                    loadChoiceAnswer(this);
                    //init
                    for (const choice of this.getElementsByClassName('question-choice')) {
                        choice.style.cursor = 'pointer';
                        choice.addEventListener('click', e => {
                            //set selection status
                            e.currentTarget.classList.toggle('question-choice-selected');
                            //save answer
                            saveChoiceAnswer(this);
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

function loadChoiceAnswer(question) {
    let stor = JSON.parse(localStorage.getItem('q-' + question.index));
    if (stor && stor.answer && Object.keys(stor.answer).length > 0) {
        let selected = [...question.getElementsByClassName('question-choice')].filter(e => stor.answer.hasOwnProperty(e.getAttribute('value')));
        if (selected.length > 0) selected.forEach(e => e.classList.add('question-choice-selected'));
    }
}

function saveChoiceAnswer(question) {
    localStorage.setItem('q-' + question.index, JSON.stringify({
        question: question.question_body.textContent.trim(),
        answer: [...question.getElementsByClassName('question-choice-selected')].reduce((pre, cur) => {
            pre[cur.getAttribute('value')] = cur.textContent.trim();
            return pre;
        }, {}),
    }));
}

window.customElements.define('ce-question', Question);