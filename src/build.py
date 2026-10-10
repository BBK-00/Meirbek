"""Жинау: src/page.html + модульдер -> ../index.html. Қолданылуы: python3 build.py [шығыс-папка]"""
import re,sys,os
d=os.path.dirname(os.path.abspath(__file__))
rd=lambda n:open(os.path.join(d,n),encoding='utf-8').read()
base=rd('page.html')
css='\n'.join(rd(f) for f in ['teacher.css','gate.css','live.css'])
html=rd('teacher.html')+'\n'+rd('gate.html')
js='\n'.join(rd(f) for f in ['teacher.js','live.js','gate.js'])
s=base.replace('/*@INJECT-CSS*/',css).replace('<!--@INJECT-HTML-->',html).replace('//@INJECT-JS',js)
for k in 'ST':
    s=re.sub(r'(?:<!--@%s-->|/\*@%s\*/|//@%s)'%(k,k,k),'',s)
    s=re.sub(r'(?:<!--@/%s-->|/\*@/%s\*/|//@/%s)'%(k,k,k),'',s)
s=re.sub(r'<title>(.*?)</title>','',s,count=1,flags=re.S)
doc=('<!doctype html><html lang="kk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
     '<title>3D-модельдеу және CAD-жүйелер · Surface</title>'
     '<script src="config.js"></script><script src="common.js"></script><script src="db.js"></script></head><body>'+s+'</body></html>')
out=sys.argv[1] if len(sys.argv)>1 else os.path.join(d,'..')
os.makedirs(out,exist_ok=True)
open(os.path.join(out,'index.html'),'w',encoding='utf-8').write(doc)
m=re.search(r'<script>([\s\S]*?)</script>',s);open('_check.js','w',encoding='utf-8').write(m.group(1))
print('index.html',len(doc))
