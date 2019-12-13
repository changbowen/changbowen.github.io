class NotifyPop {
    constructor() {
    }

    /**
     * @param {number} duration in milliseconds
     * @param {Node | string} nodes
     */
    static notify(duration, ...nodes) {
        let pop = document.createElement('div');
        pop.style = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            opacity: 0;
            transition: opacity 0.4s ease-out;
        `;
        pop.append(...nodes);
        document.body.appendChild(pop);
        setTimeout(()=>{
            pop.style.opacity = '1';
            setTimeout(()=>{
                pop.style.opacity = '0';
                setTimeout(() => pop.remove(), 1000);
            }, duration);
        });

    }
}