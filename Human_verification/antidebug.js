 
 
 
 
 
 
 
 
const TRAP = false;
export function installAntidebug(enabled) {
    if (!enabled)
        return;
     
    const timerTrap = () => {
        const start = performance.now();
         
        debugger;
    };
    setInterval(timerTrap, 2000);
}
