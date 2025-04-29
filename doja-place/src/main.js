import './style.css';
import logoGP from '../assets/logoGP.png';

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const bucket = 'apps-releases';
const prefixes = ['doja-conferencia/', 'doja-inventario/'];

// Layout principal
document.querySelector('#app').innerHTML = `
  <div>
    <a href="https://www.grupopereirabrasil.com.br/" target="_blank">
      <img src="${logoGP}" class="logo" alt="Grupo Pereira logo" />
    </a>
    <h1>Versões Disponíveis - Produção</h1>
    <div id="apk-sections"></div>
    <footer class="main-footer bg-white border-top" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1rem; margin-top: 2rem; text-align: center;">
  <strong>
      Copyright &copy; 2025
      <a href="https://www.grupopereirabrasil.com.br/" target="_blank">Grupo Pereira</a>.
    </strong>
    <div>Todos os Direitos Reservados</div>
    <div class="mt-1"><b>Criado por</b> Eduardo Coppi</div>
  </footer>
  </div>
`;

// Inicializa o cliente S3 com suporte ao MinIO
const s3Client = new S3Client({
  region: 'us-east-1',
  endpoint: endpoint,
  forcePathStyle: true, 
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretKey,
  },
});

async function getDownloadLink(key) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1h
}

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

async function fetchApks(prefix, containerId) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });

    const response = await s3Client.send(command);

    const apks = [];
    for (const item of response.Contents || []) {
      if (!item.Key.endsWith('.apk')) continue;

      const key = item.Key.replace(prefix, '');
      const url = await getDownloadLink(item.Key);
      const lastModified = new Date(item.LastModified);
      const sizeMB = (item.Size / 1024 / 1024).toFixed(2) + ' MB';

      apks.push({ key, url, lastModified, sizeMB });
    }

    const container = document.getElementById(containerId);
    container.innerHTML = '';

    if (apks.length === 0) {
      container.innerHTML = '<p>Nenhum APK encontrado.</p>';
      return;
    }

    const production = apks
      .filter(a => a.key.includes('production') || a.key.includes('-prod-'));

    const betas = apks.filter(a => !production.includes(a));

    production.sort((a, b) => b.lastModified - a.lastModified);
    betas.sort((a, b) => b.lastModified - a.lastModified);

    const latest = production[0];

    const latestDiv = document.createElement('div');
    latestDiv.innerHTML = `
      <h3>Última versão:</h3>
      <p><strong><a href="${latest.url}" target="_blank">${latest.key}</a></strong></p>
      <p>Última modificação: ${latest.lastModified.toLocaleString()}</p>
      <p>Tamanho: ${latest.sizeMB}</p>
    `;
    container.appendChild(latestDiv);

    const button = document.createElement('button');
    button.textContent = 'Mostrar versões anteriores / beta';
    button.className = 'button-show-more';
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
