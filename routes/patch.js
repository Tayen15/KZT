const fs = require('fs');
const file = '../../web/src/app/dashboard/owner/page.tsx';
let text = fs.readFileSync(file, 'utf8');

const regex = /<div className="space-y-3">[\s\S]*?<p>No active lofi sessions<\/p>[\s\S]*?<\/div>[\s\S]*?<\/div>/;

const replacement = `<div className="space-y-3">
               {lofiSessions.length === 0 ? (
                 <div className="text-center text-text-secondary py-8 bg-dark-secondary rounded-lg border border-border-dark border-dashed">
                    <svg className="w-10 h-10 mx-auto opacity-50 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <p>No active lofi sessions</p>
                 </div>
               ) : (
                 lofiSessions.map(session => (
                    <div key={session.guildId} className="bg-dark-secondary rounded-lg p-3 border border-border-dark flex items-center justify-between">
                        <div>
                            <p className="font-bold text-white mb-1">Guild: {session.guildId}</p>
                            <p className="text-xs text-text-secondary">Started: {new Date(session.startedAt).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-semibold px-2 py-1 bg-discord/20 text-discord rounded-full">Active</span>
                        </div>
                    </div>
                 ))
               )}
            </div>`;

text = text.replace(regex, replacement);
text = text.replace('<button className="text-sm text-discord hover:text-discord-hover transition-colors font-medium">', '<button onClick={fetchData} type="button" className="text-sm text-discord hover:text-discord-hover transition-colors font-medium">');

fs.writeFileSync(file, text);
console.log('Patch successful');
