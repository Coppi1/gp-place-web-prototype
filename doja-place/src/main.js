import './styles/style.css';
import { listApks, generateDownloadUrl } from './services/s3Service';
import { renderHeader } from './components/Header';

const bucketProd = 'apps-releases';
const bucketHomolog = 'apps-homologacao';
const prefixes = ['doja-conferencia/', 'doja-inventario/', 'doja-expedicao/'];
const homologPrefixes = ['doja-conferencia/', 'doja-inventario/', 'doja-expedicao/'];

document.querySelector('#app').innerHTML = `
  ${renderHeader()}
  <div class="app-description">
  <p>
    A Central DOJA é uma plataforma desenvolvida para disponibilizar, de forma prática e segura,
    as versões atualizadas dos aplicativos utilizados nas operações logísticas do Grupo Pereira.
    Aqui, você encontrará soluções como <strong>Doja Conferência</strong>, <strong>Doja Inventário</strong> e
    <strong>Doja Expedição</strong>, cada uma voltada à otimização de processos específicos como conferência de cargas,
    controle de inventário e expedição de mercadorias.
  </p>
  <p>
    Utilize o filtro abaixo para escolher o ambiente desejado (Produção ou Homologação) e baixe a versão adequada para seu uso.
  </p>
  </div>
  <div class="select-env-container">
    <label for="env-select"><strong>Ambiente:</strong></label>
    <select id="env-select">
      <option value="prod">Produção</option>
      <option value="homolog">Homologação</option>
    </select>
  </div>
  <div id="apk-sections"></div>
`;

const envSelect = document.getElementById('env-select');
envSelect.addEventListener('change', () => {
  renderSections(envSelect.value);
});

renderSections('prod'); 

function renderSections(env) {
  const container = document.getElementById('apk-sections');
  container.innerHTML = '';

  const bucket = env === 'homolog' ? bucketHomolog : bucketProd;
  const usedPrefixes = env === 'homolog' ? homologPrefixes : prefixes;

  usedPrefixes.forEach(prefix => renderSection(prefix, container, bucket, env));
}

async function renderSection(prefix, container, bucket, env) {
  const sectionId = `${env}-${prefix.replace(/\W/g, '')}`;
  const section = document.createElement('section');
  section.innerHTML = `
    <h2>DOJA-${prefix.replace(/doja-|\//g, '').toUpperCase()}</h2>
    <div id="${sectionId}" class="card"><p>Carregando...</p></div>
  `;
  container.appendChild(section);

  const items = await listApks(bucket, prefix);
  const apks = await Promise.all(items
    .filter(i => i.Key.endsWith('.apk'))
    .map(async item => ({
      key: item.Key.replace(prefix, ''),
      url: await generateDownloadUrl(bucket, item.Key),
      lastModified: new Date(item.LastModified),
      sizeMB: (item.Size / 1024 / 1024).toFixed(2) + ' MB'
    }))
  );

  renderApkList(apks, sectionId, bucket);
}

function renderApkList(apks, containerId, bucket) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  if (!apks.length) {
    container.innerHTML = '<p>Nenhum APK encontrado.</p>';
    return;
  }

  let production = [];
  let betas = [];

  if (bucket === bucketProd) {
    production = apks.filter(a => a.key.includes('production') || a.key.includes('-prod-'));
  
    if (!production.length && apks.length > 0) {
      production = [apks.sort((a, b) => b.lastModified - a.lastModified)[0]];
      betas = apks.filter(a => !production.includes(a));
    } else {
      betas = apks.filter(a => !production.includes(a));
    }
  } else {
    production = apks.filter(a => a.key.includes('homolog'));
    if (!production.length && apks.length > 0) {
      production = [apks.sort((a, b) => b.lastModified - a.lastModified)[0]];
      betas = apks.filter(a => !production.includes(a));
    } else {
      betas = apks.filter(a => !production.includes(a));
    }
  }

  production.sort((a, b) => b.lastModified - a.lastModified);
  betas.sort((a, b) => b.lastModified - a.lastModified);

  if (production.length > 0) {
    const latest = production[0];
    container.innerHTML += `
      <div>
        <h3>Última versão:</h3>
        <p>
          <strong>
            <a href="#" onclick="window.location.href='${latest.url}'; return false;">
              ${latest.key}
            </a>
          </strong>
        </p>
        <p>Última modificação: ${latest.lastModified.toLocaleString()}</p>
        <p>Tamanho: ${latest.sizeMB}</p>
      </div>
    `;
  }

  if (production.length > 1 || betas.length) {
    const allDiv = document.createElement('div');
    allDiv.style.display = 'none';
    allDiv.style.marginTop = '1rem';

    production.slice(1).forEach(apk => {
      allDiv.innerHTML += renderApkCard(apk);
    });

    if (betas.length) {
      betas.forEach(apk => {
        allDiv.innerHTML += renderApkCard(apk);
      });
    }

    const button = document.createElement('button');
    button.className = 'button-show-more';
    button.textContent = 'Mostrar versões anteriores / beta';
    button.addEventListener('click', () => {
      allDiv.style.display = allDiv.style.display === 'none' ? 'block' : 'none';
      button.textContent = allDiv.style.display === 'none'
        ? 'Mostrar versões anteriores / beta'
        : 'Ocultar versões anteriores / beta';
    });

    container.appendChild(button);
    container.appendChild(allDiv);
  }
}

function renderApkCard(apk) {
  return `
    <div>
      <p>
        <strong>
          <a href="#" onclick="window.location.href='${apk.url}'; return false;">
            ${apk.key}
          </a>
        </strong>
      </p>
      <p>Última modificação: ${apk.lastModified.toLocaleString()}</p>
      <p>Tamanho: ${apk.sizeMB}</p>
      <hr/>
    </div>
  `;
}