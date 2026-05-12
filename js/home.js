let btnNext = document.querySelector('.next');
let btnBack = document.querySelector('.back');

let container = document.querySelector('.container');
let list = document.querySelector('.container .list');
let thumbs = document.querySelector('.container .thumb');

btnNext.onclick = () => moveItensOnClick('next');
btnBack.onclick = () => moveItensOnClick('back');

function moveItensOnClick(type) { 
    let listItems = document.querySelectorAll(".list .item-list")
    let thumbsItems = document.querySelectorAll(".thumb .thumb-item")


    if (type === 'next') {
        list.appendChild(listItems[0]);
        thumbs.appendChild(thumbsItems[0]);
        container.classList.add('next');

    } else {
        list.prepend(listItems[listItems.length - 1]);
        thumbs.prepend(thumbsItems[thumbsItems.length - 1]);
        container.classList.add('back');
    }

    setTimeout(() => {
        container.classList.remove('next');
        container.classList.remove('back');
    }, 2000);

}
