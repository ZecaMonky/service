// Функция для добавления товара в корзину
function addToCart(productId, quantity = 1) {
    fetch('/shop/cart/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            productId,
            quantity
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Товар добавлен в корзину');
            updateCartCounter();
        } else {
            showNotification('Ошибка при добавлении товара', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Произошла ошибка', 'error');
    });
}

// Функция для обновления счетчика корзины
function updateCartCounter() {
    fetch('/shop/cart/count')
        .then(response => {
            // Отладка: выводим тип ответа и часть текста
            response.clone().text().then(txt => {
                console.log('Ответ от /shop/cart/count:', txt.slice(0, 200));
            });
            return response.json();
        })
        .then(data => {
            const counter = document.getElementById('cartCounter');
            if (counter) {
                if (data.count > 0) {
                    counter.textContent = data.count;
                    counter.style.display = 'flex';
                } else {
                    counter.style.display = 'none';
                }
            }
        })
        .catch(error => {
            console.error('Ошибка при обработке ответа /shop/cart/count:', error);
        });
}

// Функция для обновления статуса заказа
function updateOrderStatus(orderId, status) {
    fetch(`/admin/repair-orders/${orderId}/status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Статус заказа обновлен');
            // Обновляем отображение статуса на странице
            const statusElement = document.querySelector(`[data-order-id="${orderId}"] .status-badge`);
            if (statusElement) {
                statusElement.textContent = getStatusText(status);
                statusElement.className = `status-badge status-${status}`;
            }
        } else {
            showNotification('Ошибка при обновлении статуса', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Произошла ошибка', 'error');
    });
}

// Функция для отображения уведомлений
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 100);
    
    // Удаление через 3 секунды
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Функция для получения текста статуса
function getStatusText(status) {
    const statusMap = {
        'pending': 'Ожидает обработки',
        'processing': 'В обработке',
        'completed': 'Завершен',
        'cancelled': 'Отменен'
    };
    return statusMap[status] || status;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация всех подсказок Bootstrap
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Инициализация всех всплывающих подсказок Bootstrap
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
    
    // Обработка форм с предварительной валидацией
    const forms = document.querySelectorAll('form[data-validate]');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!this.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            this.classList.add('was-validated');
        });
    });
    
    // Обработка загрузки изображений
    const imageInputs = document.querySelectorAll('input[type="file"][accept="image/*"]');
    imageInputs.forEach(input => {
        input.addEventListener('change', function() {
            const preview = document.querySelector(this.dataset.preview);
            if (preview && this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
    });

    // Обновляем счетчик корзины при загрузке страницы
    updateCartCounter();
});

// Добавляем стили для уведомлений
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
    }
`;
document.head.appendChild(style); 