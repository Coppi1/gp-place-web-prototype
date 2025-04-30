import logoGP from '../assets/logoGP.png';

export function renderHeader(title = 'Central de Aplicativos DOJA') {
  return `
    <div class="header">
      <p class="logo-container">
        <img src="${logoGP}" class="logo" alt="Grupo Pereira logo" />
        <span class="title">${title}</span>
      </p>
    </div>
  `;
}
