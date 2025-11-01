function createTag(linkEl, text = '검사중...') {
  const tag = document.createElement('span');
  tag.className = 'ai-tag';
  tag.textContent = text;
  tag.style.marginLeft = '6px';
  tag.style.fontSize = '12px';
  tag.style.padding = '2px 6px';
  tag.style.borderRadius = '6px';
  tag.style.color = '#333';
  tag.style.background = '#ddd';

  const h3 = linkEl.querySelector('h3');
  if (h3) h3.insertAdjacentElement('afterend', tag);
  else linkEl.insertAdjacentElement('afterend', tag);

  return tag;
}

function updateTagColor(tag, score) {
  tag.textContent = `AI ${score.toFixed(1)}%`;
  if (score < 40) tag.style.background = '#4caf50';
  else if (score < 60) tag.style.background = '#ff9800';
  else tag.style.background = '#f44336';
  tag.style.color = '#fff';
}
