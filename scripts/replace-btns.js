const fs = require('fs');
let code = fs.readFileSync('app/accounts/AccountsClient.tsx', 'utf8');

code = code.replace(
  /<div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black\/80">\s*<button onClick=\{\(\) => setTransferModal\(a\.id\)\} className="bg-yellow-400 text-black px-6 py-2 font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-yellow-500 transition-colors">\s*Сделать Перевод\s*<\/button>\s*<\/div>/g,
  `<div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/80">
                      <button onClick={() => setTransferModal(a.id)} className="bg-yellow-400 text-black px-4 py-2 font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-yellow-500 transition-colors">
                        Перевод
                      </button>
                      {!a.is_primary && (
                        <button onClick={() => setDeleteModal(a)} className="bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-2 font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-red-500 hover:text-white transition-colors">
                          Закрыть
                        </button>
                      )}
                    </div>`
);

code = code.replace(
  /<div key=\{a\.id\} className="bg-black\/50 border border-zinc-800 p-4 rounded-xl flex justify-between items-center">\s*<div>\s*<p className="text-sm font-bold text-white">\{a\.name\}<\/p>\s*<p className="text-\[10px\] text-zinc-500 font-mono mt-1">\{a\.id\}<\/p>\s*<\/div>\s*<p className="text-xl font-bold text-green-500 flex items-center gap-1">\{a\.balance\} <img src=\{SECRET_TEXTURES\.diamond\} className="w-5 h-5 object-contain" alt="diamond" \/><\/p>\s*<\/div>/g,
  `<div key={a.id} className="relative group bg-black/50 border border-zinc-800 p-4 rounded-xl flex flex-col justify-center overflow-hidden">
                      <div className="flex justify-between items-center transition-all duration-300 group-hover:opacity-10">
                        <div>
                          <p className="text-sm font-bold text-white">{a.name} {!a.can_withdraw && <span className="ml-2 text-[10px] bg-red-400/20 text-red-400 px-2 py-0.5 rounded uppercase">БЕЗ СНЯТИЯ</span>}</p>
                          <p className="text-[10px] text-zinc-500 font-mono mt-1">{a.id}</p>
                        </div>
                        <p className="text-xl font-bold text-green-500 flex items-center gap-1">{a.balance} <img src={SECRET_TEXTURES.diamond} className="w-5 h-5 object-contain" alt="diamond" /></p>
                      </div>
                      
                      <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/80">
                        {a.can_withdraw && (
                          <button onClick={() => setTransferModal(a.id)} className="bg-yellow-400 text-black px-4 py-2 font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-yellow-500 transition-colors">
                            Снятие
                          </button>
                        )}
                        <button onClick={() => setDeleteModal(a)} className="bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-2 font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-red-500 hover:text-white transition-colors">
                          Закрыть
                        </button>
                      </div>
                    </div>`
);

fs.writeFileSync('app/accounts/AccountsClient.tsx', code);
