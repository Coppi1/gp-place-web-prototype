import './style.css';
import logoGP from '../assets/logoGP.png';

import {
  S3Client,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

const bucket = 'apps-releases';
const prefixes = ['doja-conferencia/', 'doja-inventario/'];

// Cria o layout principal
document.querySelector('#app').innerHTML = `
  <div>
    <a href="https://www.grupopereirabrasil.com.br/" target="_blank">
      <img src="${logoGP}" class="logo" alt="Grupo Pereira logo" />
    </a>
    <h1>Versões Disponíveis</h1>
    <div id="apk-sections"></div>
    <p class="read-the-docs">Lista gerada diretamente via integração com MinIO</p>
  </div>
`;

// Inicializa o cliente S3 com suporte ao MinIO
const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: endpoint,
  forcePathStyle: true, // essencial para MinIO
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
});

// Para cada prefixo (aplicativo), cria uma seção e busca seus APKs
prefixes.forEach(prefix => {
  const id = prefix.replace(/\W/g, '');
  const section = document.createElement('section');
  section.innerHTML = `
    <h2>${prefix.replace(/doja-|\//g, '').toUpperCase()}</h2>
    <div id="${id}" class="card"><p>Carregando...</p></div>
  `;
  document.getElementById('apk-sections').appendChild(section);
  fetchApks(prefix, id);
});

// Função que busca os APKs usando a SDK AWS
async function fetchApks(prefix, containerId) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);

    const apks = (response.Contents || [])
      .filter(item => item.Key.endsWith('.apk'))
      .map(item => {
        const key = item.Key.replace(prefix, '');
        const url = `${endpoint}/${bucket}/${encodeURIComponent(item.Key)}`;
        const lastModified = new Date(item.LastModified);
        const size = item.Size;

        return {
          key,
          url,
          lastModified,
          sizeMB: (size / 1024 / 1024).toFixed(2) + ' MB',
        };
      });

    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (apks.length === 0) {
      container.innerHTML = '<p>Nenhum APK encontrado.</p>';
      return;
    }

    // separa por tipo
    const production = apks
      .filter(a => a.key.includes('production') || a.key.includes('-prod-'));

    const betas = apks.filter(a => !production.includes(a));

    // ordena por data (mais recente primeiro)
    production.sort((a, b) => b.lastModified - a.lastModified);
    betas.sort((a, b) => b.lastModified - a.lastModified);

    // pega a mais recente
    const latest = production[0];

    const latestDiv = document.createElement('div');
    latestDiv.innerHTML = `
      <h3>Última versão:</h3>
      <p><strong><a href="${latest.url}" target="_blank">${latest.key}</a></strong></p>
      <p>Última modificação: ${latest.lastModified.toLocaleString()}</p>
      <p>Tamanho: ${latest.sizeMB}</p>
    `;
    container.appendChild(latestDiv);

    // botão para exibir mais
    const button = document.createElement('button');
    button.textContent = 'Mostrar versões anteriores / beta';
    button.style.marginTop = '1rem';

    const allDiv = document.createElement('div');
    allDiv.style.display = 'none';
    allDiv.style.marginTop = '1rem';

    production.slice(1).forEach(apk => {
      const div = document.createElement('div');
      div.innerHTML = `
        <p><strong><a href="${apk.url}" target="_blank">${apk.key}</a></strong></p>
        <p>Última modificação: ${apk.lastModified.toLocaleString()}</p>
        <p>Tamanho: ${apk.sizeMB}</p>
        <hr/>
      `;
      allDiv.appendChild(div);
    });

    if (betas.length > 0) {
      const betaHeader = document.createElement('h4');
      betaHeader.textContent = 'Versões beta:';
      allDiv.appendChild(betaHeader);

      betas.forEach(apk => {
        const div = document.createElement('div');
        div.innerHTML = `
          <p><strong><a href="${apk.url}" target="_blank">${apk.key}</a></strong></p>
          <p>Última modificação: ${apk.lastModified.toLocaleString()}</p>
          <p>Tamanho: ${apk.sizeMB}</p>
          <hr/>
        `;
        allDiv.appendChild(div);
      });
    }

    button.addEventListener('click', () => {
      allDiv.style.display = allDiv.style.display === 'none' ? 'block' : 'none';
      button.textContent = allDiv.style.display === 'none'
        ? 'Mostrar versões anteriores / beta'
        : 'Ocultar versões anteriores / beta';
    });

    container.appendChild(button);
    container.appendChild(allDiv);

  } catch (err) {
    document.getElementById(containerId).innerHTML = `<p style="color:red;">Erro: ${err.message}</p>`;
    console.error(err);
  }
}