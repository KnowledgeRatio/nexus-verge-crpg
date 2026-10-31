import { mountCallingReference } from './CallingReference.js';

void mountCallingReference(document.getElementById('callingReference'));
document.getElementById('printCodex').addEventListener('click', () => window.print());
