// Plugin para Logseq - Limpieza de journals vacíos (versión simple con protección)

var run = function() {
  console.log("Plugin de limpieza de journals vacíos cargado");
  
  // Función para comprobar si un journal está vacío
  var isJournalEmpty = function(page, callback) {
    // Verificar si tenemos un nombre de página válido
    if (!page || !page.name) {
      console.log("Página inválida o sin nombre");
      callback(false);
      return;
    }
    
    console.log("Verificando si journal está vacío:", page.name);
    
    logseq.Editor.getPageBlocksTree(page.name).then(function(blocks) {
      // Si no hay bloques, está vacío
      if (!blocks || blocks.length === 0) {
        console.log("No hay bloques en la página:", page.name);
        callback(true);
        return;
      }
      
      // Verificar si hay contenido real en los bloques
      var isEmpty = true;
      for (var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        // Ignoramos bloques que son solo espacios, bullets vacíos o similares
        var content = block.content || "";
        content = content.trim();
        
        // Si hay algún caracter además de espacios o puntos
        if (content !== "" && content !== "- " && content !== "-") {
          console.log("Bloque con contenido:", content);
          isEmpty = false;
          break;
        }
      }
      
      if (isEmpty) {
        console.log("La página está vacía:", page.name);
      } else {
        console.log("La página tiene contenido:", page.name);
      }
      
      callback(isEmpty);
    }).catch(function(error) {
      console.error("Error al verificar journal:", error, page.name);
      callback(false); // Por seguridad, si hay error asumimos que no está vacío
    });
  };
  
  // Función para verificar si el journal es el actual
  var isCurrentDayJournal = function(page) {
    if (!page["journal-day"]) return false;
    
    // Obtener la fecha actual en formato YYYYMMDD
    var now = new Date();
    var currentDay = now.getFullYear() * 10000 + 
                    (now.getMonth() + 1) * 100 + 
                    now.getDate();
    
    return page["journal-day"] === currentDay;
  };
  
  // Función para eliminar journals vacíos
  var removeEmptyJournals = function(minDaysOld) {
    logseq.UI.showMsg("Buscando journals vacíos...", "info");
    
    // Obtener todos los journals
    logseq.DB.datascriptQuery(`
      [:find (pull ?p [*])
       :where
       [?p :block/journal? true]]
    `).then(function(journals) {
      if (!journals || journals.length === 0) {
        logseq.UI.showMsg("No se encontraron journals", "info");
        return;
      }
      
      var currentDate = new Date();
      var removedCount = 0;
      var journalsToProcess = 0;
      var journalsProcessed = 0;
      var validJournals = [];
      var skippedCurrent = 0;
      
      // Filtrar journals válidos
      journals.forEach(function(journalData) {
        var page = journalData[0];
        if (page && page.name) {
          // Proteger el journal del día actual
          if (isCurrentDayJournal(page)) {
            console.log("Saltando journal del día actual:", page.name);
            skippedCurrent++;
          } else {
            validJournals.push(page);
            journalsToProcess++;
          }
        } else {
          console.log("Ignorando journal inválido o sin nombre");
        }
      });
      
      console.log("Total de journals válidos encontrados:", journalsToProcess);
      
      if (journalsToProcess === 0) {
        var msg = "No se encontraron journals válidos para procesar";
        if (skippedCurrent > 0) {
          msg += " (se excluyó el journal del día actual)";
        }
        logseq.UI.showMsg(msg, "info");
        return;
      }
      
      // Procesar cada journal válido
      validJournals.forEach(function(page) {
        try {
          console.log("Procesando journal:", page.name);
          
          // Determine journal date: try journal-day, then created-at
          var journalDate = null;
          var diffDays = 0;
          
          // Método 1: Usar la propiedad 'journal-day'
          if (page["journal-day"]) {
            var journalTimestamp = page["journal-day"];
            // Convertir a fecha (el formato es YYYYMMDD)
            var year = Math.floor(journalTimestamp / 10000);
            var month = Math.floor((journalTimestamp % 10000) / 100) - 1; // Meses en JS son 0-11
            var day = journalTimestamp % 100;
            journalDate = new Date(year, month, day);
            
            console.log("Fecha del journal desde journal-day:", journalDate);
          } 
          // Método 2: Usar la propiedad 'created-at'
          else if (page["created-at"]) {
            var createdTimestamp = page["created-at"];
            journalDate = new Date(createdTimestamp);
            
            console.log("Fecha del journal desde created-at:", journalDate);
          }
          
          // Si no pudimos determinar la fecha, asumimos que es lo suficientemente antiguo
          if (!journalDate || isNaN(journalDate.getTime())) {
            console.log("No se pudo determinar la fecha exacta, asumiendo journal antiguo");
            diffDays = minDaysOld + 1;
          } else {
            // Calcular la diferencia en días
            var diffTime = currentDate - journalDate; // Sin valor absoluto para detectar fechas futuras
            diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
              // Es una fecha futura
              console.log("Journal:", page.name, "Es del futuro (en", -diffDays, "días)");
            } else {
              // Es una fecha pasada o presente
              console.log("Journal:", page.name, "Edad en días:", diffDays);
            }
          }
          
          // Solo procesar journals que tengan al menos la edad mínima configurada
          if (diffDays >= minDaysOld) {
            // Comprobar si el journal está vacío
            isJournalEmpty(page, function(isEmpty) {
              if (isEmpty) {
                console.log("Eliminando journal vacío:", page.name);
                logseq.Editor.deletePage(page.name).then(function() {
                  removedCount++;
                  journalsProcessed++;
                  checkCompletion();
                }).catch(function(error) {
                  console.error("Error al eliminar página:", error);
                  journalsProcessed++;
                  checkCompletion();
                });
              } else {
                console.log("Journal no está vacío:", page.name);
                journalsProcessed++;
                checkCompletion();
              }
            });
          } else {
            console.log("Journal no es lo suficientemente antiguo:", page.name);
            journalsProcessed++;
            checkCompletion();
          }
        } catch (error) {
          console.error("Error procesando journal:", error);
          journalsProcessed++;
          checkCompletion();
        }
      });
      
      // Función para verificar si se completó el procesamiento
      function checkCompletion() {
        if (journalsProcessed >= journalsToProcess) {
          if (removedCount > 0) {
            var msg = "Se han eliminado " + removedCount + " journals vacíos";
            if (skippedCurrent > 0) {
              msg += " (se excluyó el journal del día actual)";
            }
            logseq.UI.showMsg(msg, "success");
          } else {
            var msg = "No se encontraron journals vacíos para eliminar";
            if (skippedCurrent > 0) {
              msg += " (se excluyó el journal del día actual)";
            }
            logseq.UI.showMsg(msg, "info");
          }
        }
      }
    }).catch(function(error) {
      console.error("Error al obtener journals:", error);
      logseq.UI.showMsg("Error al procesar journals", "error");
    });
  };
  
  // Función para verificar journals vacíos (sin eliminarlos)
  var verifyEmptyJournals = function() {
    logseq.UI.showMsg("Verificando journals vacíos...", "info");
    
    logseq.DB.datascriptQuery(`
      [:find (pull ?p [*])
       :where
       [?p :block/journal? true]]
    `).then(function(journals) {
      if (!journals || journals.length === 0) {
        logseq.UI.showMsg("No se encontraron journals", "info");
        return;
      }
      
      var journalsToProcess = 0;
      var journalsProcessed = 0;
      var emptyJournals = [];
      var validJournals = [];
      var skippedCurrent = 0;
      
      // Filtrar journals válidos
      journals.forEach(function(journalData) {
        var page = journalData[0];
        if (page && page.name) {
          // Proteger el journal del día actual
          if (isCurrentDayJournal(page)) {
            console.log("Saltando journal del día actual:", page.name);
            skippedCurrent++;
          } else {
            validJournals.push(page);
            journalsToProcess++;
          }
        }
      });
      
      console.log("Total de journals válidos para verificar:", journalsToProcess);
      
      if (journalsToProcess === 0) {
        var msg = "No se encontraron journals válidos para verificar";
        if (skippedCurrent > 0) {
          msg += " (se excluyó el journal del día actual)";
        }
        logseq.UI.showMsg(msg, "info");
        return;
      }
      
      // Verificar cada journal
      validJournals.forEach(function(page) {
        isJournalEmpty(page, function(isEmpty) {
          if (isEmpty) {
            console.log("Journal VACÍO:", page.name);
            emptyJournals.push(page.name);
          } else {
            console.log("Journal con contenido:", page.name);
          }
          
          journalsProcessed++;
          
          if (journalsProcessed >= journalsToProcess) {
            if (emptyJournals.length > 0) {
              console.log("Journals vacíos encontrados:", emptyJournals.length);
              console.log("Lista de journals vacíos:", emptyJournals);
              
              var msg = "Se encontraron " + emptyJournals.length + " journals vacíos. Lista en consola.";
              if (skippedCurrent > 0) {
                msg += " (se excluyó el journal del día actual)";
              }
              logseq.UI.showMsg(msg, "info");
            } else {
              var msg = "No se encontraron journals vacíos";
              if (skippedCurrent > 0) {
                msg += " (se excluyó el journal del día actual)";
              }
              logseq.UI.showMsg(msg, "info");
            }
          }
        });
      });
    }).catch(function(error) {
      console.error("Error al obtener journals:", error);
      logseq.UI.showMsg("Error al verificar journals", "error");
    });
  };
  
  // Registrar comandos slash para eliminar journals
  logseq.Editor.registerSlashCommand("Eliminar todos los journals vacíos", function() {
    removeEmptyJournals(-99999); // Un número negativo eliminará cualquier journal, ignorando la antigüedad
  });
  
  logseq.Editor.registerSlashCommand("Eliminar journals vacíos (antiguos)", function() {
    removeEmptyJournals(0); // Cero eliminará cualquier journal que no sea del futuro
  });
  
  logseq.Editor.registerSlashCommand("Eliminar journals vacíos (solo del pasado)", function() {
    removeEmptyJournals(1); // Eliminará solo journals de hace al menos 1 día
  });
  
  // Registrar comando para verificar journals vacíos (sin eliminarlos)
  logseq.Editor.registerSlashCommand("Verificar journals vacíos", function() {
    verifyEmptyJournals();
  });
  
  // Registrar comando para mostrar todos los journals
  logseq.Editor.registerSlashCommand("Listar journals", function() {
    logseq.DB.datascriptQuery(`
      [:find (pull ?p [*])
       :where
       [?p :block/journal? true]]
    `).then(function(journals) {
      if (!journals || journals.length === 0) {
        logseq.UI.showMsg("No se encontraron journals", "info");
        return;
      }
      
      var validCount = 0;
      console.log("Lista de todos los journals:");
      journals.forEach(function(journalData) {
        var page = journalData[0];
        if (page && page.name) {
          console.log("Journal:", page.name);
          console.log("Propiedades:", page);
          validCount++;
        }
      });
      
      logseq.UI.showMsg("Se han listado " + validCount + " journals válidos en la consola", "info");
    }).catch(function(error) {
      console.error("Error al obtener journals:", error);
      logseq.UI.showMsg("Error al listar journals", "error");
    });
  });
};

logseq.ready(run);
