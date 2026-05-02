document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.card');
    const exploreBtn = document.getElementById('exploreBtn');

    // Add subtle entrance animation
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 * index);
    });

    // Hover sound effect (mocked with console for now)
    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            console.log('Hovering over agent intelligence node...');
        });
    });

    exploreBtn.addEventListener('click', () => {
        alert('Welcome to the Zynx Intelligence Hub. The portal is initializing...');
    });
});
