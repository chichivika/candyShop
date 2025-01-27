let draggedObject = null;
let productsInCartCount = 0;
let attentionTimerId = null;

// === INIT ===

window.onload = function(){
    const productsEl = getAllProducts();
    productsEl.forEach((productEl) => {
        productEl.classList.add('not-selected-img');
        productEl.classList.add('not-touched-img');
        productEl.ondragstart = () => false;
        productEl.addEventListener('pointerdown', onProductPointerDown);
    });
    setAttentionTimer();
};

// === helpers ===

function getRandomIndexFromTo(start, end) {
    const randomRest = Math.random();
    const randomNumber = randomRest * (end - start) + start;
    return Math.floor(randomNumber);
}

// === DOM ELEMENT GETTERS ===

function getAllProducts() {
    return document.querySelectorAll('.shop-product-on-shelf');
}

function getRandomProduct() {
    const allProducts = [...getAllProducts()].filter((product) => product.hidden === false);

    if(!allProducts.length) {
        return null;
    }

    const randomIndex = getRandomIndexFromTo(0, allProducts.length);
    return allProducts[randomIndex];
}

function getCartDropArea() {
   return document.querySelector('.shop-cart-drop-area');
}

function getBuyButton() {
    return document.querySelector('.shop-buy-button');
}

// === BUY LOGIC ===

function showBuyButton() {
    const button = getBuyButton();
    if(!button) {
        return;
    }

    button.style.display = 'block';

    function addPulseAnimation() {
        button.classList.add('shop-buy-button-pulse');
        button.removeEventListener('animationend', addPulseAnimation);
    }
    button.addEventListener('animationend', addPulseAnimation);
}

function onBuy() {
    window.location.reload();
}

// === ATTENTION TIMER ===

function setAttentionTimer() {
    clearAttentionTimer();
    attentionTimerId = setTimeout(() => {
        const product = getRandomProduct();
        if(!product) {
            setAttentionTimer();
        }

        function onAnimationEnd() {
            product.classList.remove('shop-product-attention');
            product.removeEventListener('animationend', onAnimationEnd);
            setAttentionTimer();
        }

        product.classList.add('shop-product-attention');
        product.addEventListener('animationend', onAnimationEnd);
    }, 3000);
}

function clearAttentionTimer() {
    if(typeof attentionTimerId === 'number') {
        clearTimeout(attentionTimerId);
        attentionTimerId = null;
    }
}

// === DND ===

function initDragMode(event, productEl, initialPosition) {
    clearAttentionTimer();

    document.body.classList.add('dnd-mode');

    draggedObject = cloneProductToDrag(productEl);
    productEl.hidden = true;

    setNewProductCoordinates(event, draggedObject, initialPosition);
    document.body.append(draggedObject);
}

function clearDragMode({productEl, initialPosition, isInCart}) {

    document.body.classList.remove('dnd-mode');

    setAttentionTimer();

    if(isInCart) {
        draggedObject = null;
        return;
    }
    
    const draggedRect = draggedObject.getBoundingClientRect();
    const draggedX =  draggedRect.left + window.scrollX;
    const draggedY =  draggedRect.top + window.scrollY;
    draggedObject.style.transform = `translate(${initialPosition.x - draggedX}px, ${initialPosition.y - draggedY}px)`;
    draggedObject.addEventListener('transitionend', () => {
            draggedObject.remove();
            draggedObject = null;
            productEl.hidden = false;
    });
}

function onPointerMove(event) {

    if(!draggedObject) {
        return;
    }

    event.preventDefault();
    const draggedRect = draggedObject.getBoundingClientRect();
    setNewProductCoordinates(event, draggedObject, {
        width: draggedRect.width,
        height: draggedRect.height,
    });
}

function setNewProductCoordinates(event, draggedObject, {width, height}) {
    const newLeft = event.clientX - width / 2 + window.scrollX;
    const newTop = event.clientY - height / 2 + window.scrollY;

    draggedObject.style.left = `${newLeft}px`;
    draggedObject.style.top = `${newTop}px`;
}

function cloneProductToDrag(productEl) {
    const productClone = productEl.cloneNode();
    productClone.ondragstart = () => false;

    productClone.classList.remove('shop-product-on-shelf');
    productClone.classList.add('shop-product-dragged');

    return productClone;
}

function onProductPointerDown(event) {
    if(event.button !== 0) {
        return;
    }
    if(draggedObject) {
        return;
    }

    event.preventDefault();

    const productEl = event.target;
    const initialRect = productEl.getBoundingClientRect();
    const initialPosition = {
        x: initialRect.left + window.scrollX,
        y: initialRect.top + window.scrollY,
        width: initialRect.width,
        height: initialRect.height,
    };

    initDragMode(event, productEl, initialPosition);

    document.addEventListener('pointermove', onPointerMove);
    const onPointerUp = (event) => {
        if(!draggedObject) {
            return;
        }

        event.preventDefault();
        if(!tryAddToCart(event)) {
            clearDragMode({productEl, initialPosition, isInCart: false});
        } else {
            clearDragMode({productEl, initialPosition, isInCart: true});
            productsInCartCount += 1;
            if(productsInCartCount === 3) {
                showBuyButton();
            }
        }

        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
    };
    document.addEventListener('pointerup', onPointerUp);
}

function tryAddToCart(event) {
    const cartEl = getCartDropArea();
    const draggedRect = draggedObject.getBoundingClientRect();
    const initialPosition = {
        draggedRectLeft: draggedRect.left,
        draggedRectTop: draggedRect.top,
    };

    draggedObject.hidden = true;

    const deepTarget = document.elementFromPoint(event.clientX, event.clientY);
    const isInCart = deepTarget && (deepTarget === cartEl || deepTarget.parentNode === cartEl);
    if(!isInCart) {
        draggedObject.hidden = false;
        return false;
    }

    addDraggedProductToCart(cartEl, initialPosition);
    return true;
}

function addDraggedProductToCart(cartEl, {
    draggedRectLeft,
    draggedRectTop,
}) {
    const productInCart = draggedObject;
    productInCart.classList.remove('shop-product-dragged');
    productInCart.classList.add('shop-product-in-cart');
    cartEl.append(productInCart);

    const cartRect = cartEl.getBoundingClientRect();
    const newLeft = draggedRectLeft - cartRect.left;
    productInCart.style.left = `${newLeft}px`;
    const newTop = draggedRectTop - cartRect.top;
    productInCart.style.top = `${newTop}px`;

    productInCart.hidden = false;

    const productCartRect = productInCart.getBoundingClientRect();
    const deltaY = cartRect.height - newTop - productCartRect.height;
    let deltaX = 0;

    const angleDelta = 50;
    const deltaLeft = newLeft - angleDelta;
    const deltaRight = newLeft + productCartRect.width - cartRect.width + angleDelta;

    if(deltaLeft < 0) {
        deltaX = -deltaLeft;
    } else if(deltaRight > 0) {
        deltaX = -deltaRight;
    }
    productInCart.style.transform = `${productInCart.style.transform} translate(${deltaX}px, ${deltaY}px)`;
}