import './style.css';
import logoGP from '../assets/logoGP.png';

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const bucket = 'apps-releases';
const homologBucket = 'apps-homologacao';
const prefixes = ['doja-conferencia/', 'doja-inventario/'];
const homologPrefixes = ['doja-conferencia/', 'doja-inventario/', 'doja-expedicao/'];

// Layout principal
document.querySelector('#app').innerHTML = `
  <div class="header">
    <p class="logo-container">
      <img src="${logoGP}" class="logo" alt="Grupo Pereira logo" />
      <span class="title">DOJA Place Web</span>
    </p>
  </div>
  <h1>Versões Disponíveis - Produção</h1>
  <div id="apk-sections"></div>
`;

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
    <h2>DOJA-${prefix.replace(/doja-|\//g, '').toUpperCase()}</h2>
    <div id="${id}" class="card"><p>Carregando...</p></div>
  `;
  document.getElementById('apk-sections').appendChild(section);
  fetchApks(prefix, id);
});

const homologSection = document.createElement('div');
homologSection.innerHTML = `
  <h1>Versões Disponíveis - Homologação</h1>
  <div id="apk-sections-homolog"></div>
`;

document.querySelector('#app').appendChild(homologSection);

homologPrefixes.forEach(prefix => {
  const id = `homolog-${prefix.replace(/\W/g, '')}`;
  const section = document.createElement('section');
  section.innerHTML = `
    <h2>DOJA-${prefix.replace(/doja-|\//g, '').toUpperCase()}</h2>
    <div id="${id}" class="card"><p>Carregando...</p></div>
  `;
  document.getElementById('apk-sections-homolog').appendChild(section);
  fetchApks(prefix, id, homologBucket);
});

async function fetchApks(prefix, containerId, currentBucket = bucket) {
  try {
    const command = new ListObjectsV2Command({
      Bucket: currentBucket,
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

    let production = [];
    let betas = [];

    if (currentBucket === bucket) {
      // PRODUÇÃO
      production = apks.filter(a =>
        a.key.includes('production') || a.key.includes('-prod-')
      );
      betas = apks.filter(a => !production.includes(a));
    } else {
      // HOMOLOGAÇÃO
      production = apks.filter(a =>
        a.key.includes('homolog')
      );
    
      if (production.length === 0 && apks.length > 0) {
        production = [ ...apks ].sort((a, b) => b.lastModified - a.lastModified).slice(0, 1);
        betas = apks.filter(a => !production.includes(a));
      } else {
        betas = apks.filter(a => !production.includes(a));
      }
    }

    production.sort((a, b) => b.lastModified - a.lastModified);
    betas.sort((a, b) => b.lastModified - a.lastModified);

    if (production.length > 0) {
      const latest = production[0];
    
      const latestDiv = document.createElement('div');
      latestDiv.innerHTML = `
        <h3>Última versão:</h3>
        <p><strong><a href="${latest.url}" target="_blank">${latest.key}</a></strong></p>
        <p>Última modificação: ${latest.lastModified.toLocaleString()}</p>
        <p>Tamanho: ${latest.sizeMB}</p>
      `;
      container.appendChild(latestDiv);
    } else {
      container.innerHTML = '<p>Ultima versão não encontrada encontrada.</p>';
    }

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
