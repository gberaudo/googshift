#!/usr/bin/env python3

import argparse
import glob
import re

requireMatcher = re.compile("[^/*]*goog.require\('(.+)'\)")
provideOrModuleMatcher = re.compile("goog.(?:provide|module)\('(.+)'\)")

createAnAngularModule = re.compile("[^/*]*angular.module\('?\w+'?,")
registerAngularObject = re.compile("[^/*]*\.(?:component|directive|controller|filter|value|constant)\(")

parser = argparse.ArgumentParser()
parser.add_argument('--root', action='append', dest='roots', default=[])
parser.add_argument('--js', action='append', dest='globed_sources', default=[])
args = parser.parse_args()


def analyze(f):
    with open(f, 'r') as source:
        dependencies = []
        count = 0
        name = None
        done = False
        hasAngularModule = False
        hasAngularObjectRegistrations = False
        for line in source:
            count += 1
            if (count < 25):
                mr = requireMatcher.match(line)
                if mr:
                    dependencies.append(mr.group(1))
                    # print('r', mr.group(1), line[0:-1])
                mpm = provideOrModuleMatcher.match(line) 
                if mpm:
                    name = mpm.group(1)
                    # print('pm', mpm.group(1), line[0:-1])
            if not hasAngularObjectRegistrations and registerAngularObject.match(line) is not None:
                hasAngularObjectRegistrations = True
            if not hasAngularModule and createAnAngularModule.match(line) is not None:
                # print(f, line, createAnAngularModule.match(line))
                hasAngularModule = True
            if hasAngularModule:
                done = True
                break
        if not hasAngularObjectRegistrations:
            done = True
        return {'name': name, 'deps': dependencies, 'filename': f, 'done': done}
                

sources = []
for root in args.roots:
    sources.extend(glob.glob(root + '**/*js', recursive=True))
for s in args.globed_sources:
    sources.extend(glob.glob(s, recursive=True))

by_names = {}
values = []
for s in sources:
    info = analyze(s)
    values.append(info)
    by_names[info['name']] = info

for v in values:
    todos = []
    if not v['done']:
        for d in v['deps']:
            todo = by_names.get(d)
            if todo and not todo['done']:
                todos.append(todo)
    v['todos'] = todos

values.sort(key=lambda info: len(info['todos']))
for v in values:
    if not v['done']:
        todos = v['todos']
        deps = v['deps']
        progress = 100 * (len(deps) - len(todos)) / len(deps) if todos else 100
        print('%d / %d %s (%s) %d%%' % (len(todos),  len(deps), v['filename'], v['name'], progress))

