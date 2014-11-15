/*

Copyright 2014 Roland Bouman (roland.bouman@gmail.com)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/
function truncateDate(date, resolution){
  var i;
  var years = 0, months = 0, days = 1, hours = 0, minutes = 0, seconds = 0, milliseconds = 0;
  switch (resolution) {
    case "millisecond":
      milliseconds = date.getUTCMilliseconds();
    case "second":
      seconds = date.getUTCSeconds();
    case "minute":
      minutes = date.getUTCMinutes();
    case "hour":
      hours = date.getUTCHours();
    case "day":
      days = date.getUTCDate();
    case "month":
      months = date.getUTCMonth();
    case "year":
      years = date.getUTCFullYear();
  }
  return new Date(Date.UTC(years, months, days, hours, minutes, seconds, milliseconds));
}

function dateAdd(date, add) {
  return new Date(Date.UTC(
    date.getUTCFullYear() + (add.years ? add.years : 0),
    date.getUTCMonth() + (add.months ? add.months : 0),
    date.getUTCDate() + (add.days ? add.days : 0),
    date.getUTCHours() + (add.hours ? add.hours : 0),
    date.getUTCMinutes() + (add.minutes ? add.minutes : 0),
    date.getUTCSeconds() + (add.seconds ? add.seconds : 0),
    date.getUTCMilliseconds() + (add.milliseconds ? add.milliseconds : 0)
  ));
}

var dayName = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday"
};

var monthNames = {
  0: "januari",
  1: "februari",
  2: "march",
  3: "april",
  4: "may",
  5: "june",
  6: "july",
  7: "august",
  8: "september",
  9: "october",
 10: "november",
 11: "december"
};

function formatDate(date, format){

}